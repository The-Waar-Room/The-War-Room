import { google } from "googleapis";
import { getFirestore } from "../config/firebase";
import {
  PRODUCT_TO_PLAN,
  SubscriptionDoc,
  SubscriptionEventDoc,
  SubscriptionEventSource,
  SubscriptionEventType,
} from "../types";
import { FieldValue } from "firebase-admin/firestore";

interface VerifyResult {
  success: boolean;
  plan_type: string;
  expires_at: Date;
  status: string;
}

interface SubscriptionSnapshot {
  purchaseData: Record<string, unknown>;
  expiresAt: Date;
  status: "active" | "expired" | "cancelled";
  planType: string;
}

interface ReconcileSubscriptionInput {
  appId?: string;
  userId?: string;
  purchaseToken: string;
  productId: string;
  packageName: string;
  eventSource?: SubscriptionEventSource;
  triggerEventType?: SubscriptionEventType;
  rawEvent?: Record<string, unknown>;
}

interface ReconcileSubscriptionResult {
  updated: boolean;
  appId: string;
  userId: string;
  productId: string;
  status: "active" | "expired" | "cancelled";
  previousStatus?: string;
  expiresAt: Date;
}

function getAndroidPublisher() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  return google.androidpublisher({ version: "v3", auth });
}

function mapPackageNameToAppId(packageName: string): string {
  const normalized = packageName.trim().toLowerCase();
  if (normalized === "com.sudoajay.descroll") return "deScroll";
  if (normalized === "com.sudoajay.soullens") return "soullens";
  return packageName;
}

function parseGoogleExpiry(rawValue: unknown): Date {
  const millis = Number(rawValue ?? 0);
  return Number.isFinite(millis) && millis > 0 ? new Date(millis) : new Date();
}

function deriveSubscriptionStatus(
  purchaseData: Record<string, unknown>,
  expiresAt: Date,
  forcedStatus?: "active" | "expired" | "cancelled"
): "active" | "expired" | "cancelled" {
  if (forcedStatus) return forcedStatus;

  const now = Date.now();
  const cancelReason = Number(purchaseData.cancelReason ?? -1);

  if (expiresAt.getTime() <= now) {
    return "expired";
  }

  if (cancelReason === 1 || cancelReason === 2 || cancelReason === 3) {
    return "cancelled";
  }

  return "active";
}

async function fetchGooglePlaySubscriptionSnapshot(
  purchaseToken: string,
  productId: string,
  packageName: string,
  forcedStatus?: "active" | "expired" | "cancelled"
): Promise<SubscriptionSnapshot> {
  const androidPublisher = getAndroidPublisher();

  const response = await androidPublisher.purchases.subscriptions.get({
    packageName,
    subscriptionId: productId,
    token: purchaseToken,
  });

  const purchaseData = response.data as Record<string, unknown>;
  const expiresAt = parseGoogleExpiry(purchaseData.expiryTimeMillis);
  const mapping = PRODUCT_TO_PLAN[productId];

  return {
    purchaseData,
    expiresAt,
    status: deriveSubscriptionStatus(purchaseData, expiresAt, forcedStatus),
    planType: mapping?.plan ?? "free",
  };
}

function mapTriggerEventToStatus(
  eventType?: SubscriptionEventType
): "active" | "expired" | "cancelled" | undefined {
  switch (eventType) {
    case "renewed":
      return "active";
    case "expired":
      return "expired";
    case "cancelled":
    case "refunded":
    case "revoked":
      return "cancelled";
    default:
      return undefined;
  }
}

interface LogSubscriptionEventInput {
  userId: string;
  appId: string;
  eventType: SubscriptionEventType;
  eventSource?: SubscriptionEventSource;
  planType?: string;
  productId?: string;
  basePlanId?: string;
  purchaseToken?: string;
  purchaseState?: number;
  orderId?: string;
  billingResponseCode?: number;
  billingDebugMessage?: string;
  oldStatus?: string;
  newStatus?: string;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
}

export async function logSubscriptionEvent({
  userId,
  appId,
  eventType,
  eventSource = "backend_verify",
  planType,
  productId,
  basePlanId,
  purchaseToken,
  purchaseState,
  orderId,
  billingResponseCode,
  billingDebugMessage,
  oldStatus,
  newStatus,
  occurredAt,
  metadata,
}: LogSubscriptionEventInput): Promise<void> {
  const db = getFirestore();
  const eventDoc: Omit<SubscriptionEventDoc, "created_at" | "occurred_at"> & {
    created_at: FieldValue;
    occurred_at?: Date;
  } = {
    user_id: userId,
    app_id: appId,
    event_type: eventType,
    event_source: eventSource,
    plan_type: planType,
    product_id: productId,
    base_plan_id: basePlanId,
    purchase_token: purchaseToken,
    purchase_state: purchaseState,
    order_id: orderId,
    billing_response_code: billingResponseCode,
    billing_debug_message: billingDebugMessage,
    old_status: oldStatus,
    new_status: newStatus,
    metadata,
    created_at: FieldValue.serverTimestamp(),
  };

  if (occurredAt) {
    eventDoc.occurred_at = occurredAt;
  }

  await db.collection("subscription_events").add(eventDoc);
}

/**
 * Verify a Google Play subscription purchase server-side.
 * - Calls androidpublisher.purchases.subscriptions.get
 * - Validates paymentState
 * - Maps productId to plan
 * - Upserts subscription document in Firestore
 */
export async function verifyGooglePlaySubscription(
  userId: string,
  appId: string,
  purchaseToken: string,
  productId: string,
  packageName: string,
  basePlanId: string
): Promise<VerifyResult> {
  const snapshot = await fetchGooglePlaySubscriptionSnapshot(purchaseToken, productId, packageName);

  const purchaseData = snapshot.purchaseData;

  // paymentState: 0 = pending, 1 = received, 2 = free trial, 3 = deferred
  if (purchaseData.paymentState !== 1 && purchaseData.paymentState !== 2) {
    await logSubscriptionEvent({
      userId,
      appId,
      eventType: "verify_failed",
      eventSource: "backend_verify",
      productId,
      purchaseToken,
      newStatus: "payment_not_received",
      metadata: {
        reason: "payment_not_received",
        payment_state: purchaseData.paymentState,
      },
    });
    return {
      success: false,
      plan_type: "free",
      expires_at: new Date(),
      status: "payment_not_received",
    };
  }

  // ── Map base plan to plan type (basePlanId matches PRODUCT_TO_PLAN keys) ──
  const mapping = PRODUCT_TO_PLAN[basePlanId];
  if (!mapping) {
    throw new Error(`Unknown basePlanId: ${basePlanId}`);
  }

  const startsAt = new Date();
  const expiresAt =
    snapshot.expiresAt.getTime() > 0
      ? snapshot.expiresAt
      : new Date(startsAt.getTime() + mapping.days * 24 * 60 * 60 * 1000);

  // ── Upsert subscription in Firestore ──
  const db = getFirestore();
  const subRef = db.collection("subscriptions");

  // Check if this purchase token already exists
  const existing = await subRef
    .where("purchase_token", "==", purchaseToken)
    .where("app_id", "==", appId)
    .limit(1)
    .get();

  const subData: Omit<SubscriptionDoc, "starts_at" | "expires_at" | "verified_at"> & {
    starts_at: FieldValue | Date;
    expires_at: Date;
    verified_at: FieldValue;
  } = {
    user_id: userId,
    app_id: appId,
    plan_type: mapping.plan,
    purchase_token: purchaseToken,
    product_id: productId,
    status: snapshot.status,
    starts_at: startsAt,
    expires_at: expiresAt,
    verified_at: FieldValue.serverTimestamp(),
    raw_google_response: purchaseData as unknown as Record<string, unknown>,
  };

  if (existing.empty) {
    await subRef.add(subData);
  } else {
    await existing.docs[0].ref.update(subData);
  }

  await logSubscriptionEvent({
    userId,
    appId,
    eventType: "verify_success",
    eventSource: "backend_verify",
    planType: mapping.plan,
    productId,
    purchaseToken,
    newStatus: snapshot.status,
    metadata: {
      expires_at: expiresAt.toISOString(),
      is_new: existing.empty,
      payment_state: purchaseData.paymentState,
    },
  });

  return {
    success: true,
    plan_type: mapping.plan,
    expires_at: expiresAt,
    status: snapshot.status,
  };
}

/**
 * Get the user's active subscription for a specific app.
 */
export async function getActiveSubscription(
  userId: string,
  appId: string
): Promise<SubscriptionDoc | null> {
  const db = getFirestore();
  const now = new Date();

  const snap = await db
    .collection("subscriptions")
    .where("user_id", "==", userId)
    .where("app_id", "==", appId)
    .where("status", "==", "active")
    .where("expires_at", ">", now)
    .orderBy("expires_at", "desc")
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].data() as SubscriptionDoc;
}

export async function reconcileSubscriptionFromGoogle({
  appId,
  userId,
  purchaseToken,
  productId,
  packageName,
  eventSource = "google_play",
  triggerEventType,
  rawEvent,
}: ReconcileSubscriptionInput): Promise<ReconcileSubscriptionResult> {
  const db = getFirestore();

  const existingSnap = await db
    .collection("subscriptions")
    .where("purchase_token", "==", purchaseToken)
    .limit(1)
    .get();

  const existingDoc = existingSnap.empty ? null : existingSnap.docs[0];
  const existingData = existingDoc?.data() as SubscriptionDoc | undefined;

  const resolvedAppId = appId ?? existingData?.app_id ?? mapPackageNameToAppId(packageName);
  const resolvedUserId = userId ?? existingData?.user_id ?? "unknown";

  const forcedStatus = mapTriggerEventToStatus(triggerEventType);
  const snapshot = await fetchGooglePlaySubscriptionSnapshot(
    purchaseToken,
    productId,
    packageName,
    forcedStatus
  );

  const previousStatus = existingData?.status;
  const hasStatusChanged = previousStatus !== snapshot.status;
  const hasExpiryChanged =
    existingData?.expires_at?.toDate?.()?.getTime?.() !== snapshot.expiresAt.getTime();

  if (existingDoc) {
    // Preserve existing plan_type if snapshot couldn't resolve it (productId != basePlanId)
    const resolvedPlanType = snapshot.planType !== "free" ? snapshot.planType : (existingData?.plan_type ?? snapshot.planType);

    await existingDoc.ref.update({
      app_id: resolvedAppId,
      user_id: resolvedUserId,
      plan_type: resolvedPlanType,
      product_id: productId,
      status: snapshot.status,
      expires_at: snapshot.expiresAt,
      verified_at: FieldValue.serverTimestamp(),
      raw_google_response: snapshot.purchaseData,
    });
  }

  if (triggerEventType) {
    await logSubscriptionEvent({
      userId: resolvedUserId,
      appId: resolvedAppId,
      eventType: triggerEventType,
      eventSource,
      planType: snapshot.planType,
      productId,
      purchaseToken,
      oldStatus: previousStatus,
      newStatus: snapshot.status,
      metadata: rawEvent,
    });
  }

  if (hasStatusChanged || hasExpiryChanged) {
    await logSubscriptionEvent({
      userId: resolvedUserId,
      appId: resolvedAppId,
      eventType: hasStatusChanged
        ? snapshot.status === "active"
          ? "renewed"
          : snapshot.status
        : "plan_transition",
      eventSource,
      planType: snapshot.planType,
      productId,
      purchaseToken,
      oldStatus: previousStatus,
      newStatus: snapshot.status,
      metadata: {
        expires_at: snapshot.expiresAt.toISOString(),
        raw_event: rawEvent,
      },
    });
  }

  return {
    updated: Boolean(existingDoc) && (hasStatusChanged || hasExpiryChanged),
    appId: resolvedAppId,
    userId: resolvedUserId,
    productId,
    status: snapshot.status,
    previousStatus,
    expiresAt: snapshot.expiresAt,
  };
}

export async function reconcileActiveSubscriptions(limit = 100): Promise<{
  scanned: number;
  updated: number;
  failed: number;
}> {
  const db = getFirestore();
  const snap = await db
    .collection("subscriptions")
    .where("status", "in", ["active", "cancelled"])
    .limit(limit)
    .get();

  let updated = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as SubscriptionDoc;
    try {
      const result = await reconcileSubscriptionFromGoogle({
        appId: data.app_id,
        userId: data.user_id,
        purchaseToken: data.purchase_token,
        productId: data.product_id,
        packageName: (data.raw_google_response?.packageName as string) ?? "com.sudoajay.descroll",
        eventSource: "google_play",
      });
      if (result.updated) {
        updated += 1;
      }
    } catch (error) {
      failed += 1;
      await logSubscriptionEvent({
        userId: data.user_id,
        appId: data.app_id,
        eventType: "reconciliation_mismatch",
        eventSource: "google_play",
        planType: data.plan_type,
        productId: data.product_id,
        purchaseToken: data.purchase_token,
        oldStatus: data.status,
        metadata: {
          error: error instanceof Error ? error.message : "unknown_error",
        },
      });
    }
  }

  return {
    scanned: snap.size,
    updated,
    failed,
  };
}
