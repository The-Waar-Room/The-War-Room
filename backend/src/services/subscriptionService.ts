import { createHash } from "node:crypto";
import { google, androidpublisher_v3 } from "googleapis";
import { FieldValue } from "firebase-admin/firestore";
import { getFirestore } from "../config/firebase";
import {
  PRODUCT_TO_PLAN,
  PlanType,
  SubscriptionDoc,
  SubscriptionEventSource,
  SubscriptionEventType,
  SubscriptionStatus,
} from "../types";

interface VerifyResult {
  success: boolean;
  linkStatus: "linked" | "already_linked";
  entitlementStatus: SubscriptionStatus;
  planType: PlanType;
  basePlanId: string;
  productId: string;
  expiresAt: Date;
}

export interface SubscriptionSnapshot {
  purchaseData: Record<string, unknown>;
  startsAt: Date;
  expiresAt: Date;
  status: SubscriptionStatus;
  googleSubscriptionState: string;
  planType: PlanType;
  basePlanId: string;
  productId: string;
  latestOrderId?: string;
  linkedPurchaseToken?: string;
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
  status: SubscriptionStatus;
  previousStatus?: string;
  expiresAt: Date;
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

export class PurchaseOwnershipConflictError extends Error {
  constructor() {
    super("Purchase is already linked to another account");
    this.name = "PurchaseOwnershipConflictError";
  }
}

export class PurchaseVerificationError extends Error {
  constructor(
    message: string,
    public readonly reason = "purchase_verification_failed",
    public readonly upstreamStatus?: number
  ) {
    super(message);
    this.name = "PurchaseVerificationError";
  }
}

export function resolvePurchaseLinkStatus(
  existingUserId: unknown,
  requestedUserId: string
): "linked" | "already_linked" {
  if (
    typeof existingUserId === "string" &&
    existingUserId !== "unknown" &&
    existingUserId !== requestedUserId
  ) {
    throw new PurchaseOwnershipConflictError();
  }
  return existingUserId === requestedUserId ? "already_linked" : "linked";
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

export function hashPurchaseToken(purchaseToken: string): string {
  return createHash("sha256").update(purchaseToken).digest("hex");
}

function subscriptionDocumentId(appId: string, purchaseToken: string): string {
  return createHash("sha256").update(`${appId}:${purchaseToken}`).digest("hex");
}

function parseGoogleDate(rawValue: string | null | undefined, fallback = new Date()): Date {
  if (!rawValue) return fallback;
  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export function normalizeSubscriptionStatus(
  googleState: string | null | undefined
): SubscriptionStatus {
  switch (googleState) {
    case "SUBSCRIPTION_STATE_ACTIVE":
      return "active";
    case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD":
      return "grace_period";
    case "SUBSCRIPTION_STATE_ON_HOLD":
      return "on_hold";
    case "SUBSCRIPTION_STATE_PAUSED":
      return "paused";
    case "SUBSCRIPTION_STATE_PENDING":
    case "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED":
      return "pending";
    case "SUBSCRIPTION_STATE_CANCELED":
      return "cancelled";
    case "SUBSCRIPTION_STATE_EXPIRED":
      return "expired";
    default:
      return "unknown";
  }
}

export function isCloudPremiumStatus(status: SubscriptionStatus): boolean {
  return status === "active" || status === "grace_period";
}

function chooseLineItem(
  purchase: androidpublisher_v3.Schema$SubscriptionPurchaseV2,
  expectedProductId?: string
): androidpublisher_v3.Schema$SubscriptionPurchaseLineItem {
  const lineItems = purchase.lineItems ?? [];
  const matchingItems = expectedProductId
    ? lineItems.filter((item) => item.productId === expectedProductId)
    : lineItems;
  const candidates = matchingItems.length > 0 ? matchingItems : lineItems;

  const selected = candidates
    .slice()
    .sort(
      (left, right) =>
        parseGoogleDate(right.expiryTime, new Date(0)).getTime() -
        parseGoogleDate(left.expiryTime, new Date(0)).getTime()
    )[0];

  if (!selected) {
    throw new PurchaseVerificationError(
      "Google Play response did not contain a subscription line item",
      "missing_line_item"
    );
  }
  if (expectedProductId && selected.productId !== expectedProductId) {
    throw new PurchaseVerificationError(
      "Google Play product does not match the requested product",
      "product_mismatch"
    );
  }

  return selected;
}

export function snapshotFromGooglePurchase(
  purchase: androidpublisher_v3.Schema$SubscriptionPurchaseV2,
  expectedProductId?: string
): SubscriptionSnapshot {
  const lineItem = chooseLineItem(purchase, expectedProductId);
  const basePlanId = lineItem.offerDetails?.basePlanId;
  const productId = lineItem.productId;

  if (!basePlanId || !PRODUCT_TO_PLAN[basePlanId]) {
    throw new PurchaseVerificationError(
      `Unknown Google Play base plan: ${basePlanId ?? "missing"}`,
      "unknown_base_plan"
    );
  }
  if (!productId) {
    throw new PurchaseVerificationError(
      "Google Play response did not contain a product ID",
      "missing_product_id"
    );
  }

  const googleSubscriptionState = purchase.subscriptionState ?? "SUBSCRIPTION_STATE_UNSPECIFIED";

  return {
    purchaseData: purchase as unknown as Record<string, unknown>,
    startsAt: parseGoogleDate(purchase.startTime),
    expiresAt: parseGoogleDate(lineItem.expiryTime),
    status: normalizeSubscriptionStatus(googleSubscriptionState),
    googleSubscriptionState,
    planType: PRODUCT_TO_PLAN[basePlanId].plan,
    basePlanId,
    productId,
    latestOrderId: lineItem.latestSuccessfulOrderId ?? purchase.latestOrderId ?? undefined,
    linkedPurchaseToken: purchase.linkedPurchaseToken ?? undefined,
  };
}

async function fetchGooglePlaySubscriptionSnapshot(
  purchaseToken: string,
  productId: string,
  packageName: string
): Promise<SubscriptionSnapshot> {
  const androidPublisher = getAndroidPublisher();
  try {
    const response = await androidPublisher.purchases.subscriptionsv2.get({
      packageName,
      token: purchaseToken,
    });
    return snapshotFromGooglePurchase(response.data, productId);
  } catch (error) {
    if (error instanceof PurchaseVerificationError) throw error;
    const responseStatus = (error as { response?: { status?: number } }).response?.status;
    if (responseStatus === 400 || responseStatus === 401 || responseStatus === 403 || responseStatus === 404) {
      const reason =
        responseStatus === 404
          ? "purchase_not_found"
          : responseStatus === 401 || responseStatus === 403
            ? "google_api_permission_denied"
            : "google_rejected_purchase";
      throw new PurchaseVerificationError(
        describeGooglePlayError(error),
        reason,
        responseStatus
      );
    }
    throw error;
  }
}

function describeGooglePlayError(error: unknown): string {
  const responseData = (error as { response?: { data?: unknown } }).response?.data;

  if (typeof responseData === "object" && responseData !== null) {
    const data = responseData as {
      error?: { message?: string; status?: string };
      message?: string;
    };
    const message = data.error?.message ?? data.message;
    const status = data.error?.status;

    if (message && status) return `${status}: ${message}`;
    if (message) return message;
  }

  return error instanceof Error ? error.message : "Google Play verification failed";
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
  const eventDoc: Record<string, unknown> = {
    user_id: userId,
    app_id: appId,
    event_type: eventType,
    event_source: eventSource,
    created_at: FieldValue.serverTimestamp(),
  };

  if (planType !== undefined) eventDoc.plan_type = planType;
  if (productId !== undefined) eventDoc.product_id = productId;
  if (basePlanId !== undefined) eventDoc.base_plan_id = basePlanId;
  if (purchaseToken !== undefined) eventDoc.purchase_token_hash = hashPurchaseToken(purchaseToken);
  if (purchaseState !== undefined) eventDoc.purchase_state = purchaseState;
  if (orderId !== undefined) eventDoc.order_id = orderId;
  if (billingResponseCode !== undefined) eventDoc.billing_response_code = billingResponseCode;
  if (billingDebugMessage !== undefined) eventDoc.billing_debug_message = billingDebugMessage;
  if (oldStatus !== undefined) eventDoc.old_status = oldStatus;
  if (newStatus !== undefined) eventDoc.new_status = newStatus;
  if (metadata !== undefined) eventDoc.metadata = metadata;
  if (occurredAt) eventDoc.occurred_at = occurredAt;

  await db.collection("subscription_events").add(eventDoc);
}

/**
 * Verifies the token with Google Play and links it to exactly one Firebase UID.
 * Client-provided plan, order, payment, and email data are intentionally ignored.
 */
export async function verifyGooglePlaySubscription(
  userId: string,
  appId: string,
  purchaseToken: string,
  productId: string,
  packageName: string
): Promise<VerifyResult> {
  if (mapPackageNameToAppId(packageName).toLowerCase() !== appId.toLowerCase()) {
    throw new PurchaseVerificationError(
      "Package name does not belong to the authenticated app",
      "package_app_mismatch"
    );
  }

  const snapshot = await fetchGooglePlaySubscriptionSnapshot(purchaseToken, productId, packageName);
  const db = getFirestore();
  const subscriptions = db.collection("subscriptions");
  const targetRef = subscriptions.doc(subscriptionDocumentId(appId, purchaseToken));
  const legacySnap = await subscriptions
    .where("purchase_token", "==", purchaseToken)
    .where("app_id", "==", appId)
    .limit(1)
    .get();
  const legacyRef = legacySnap.empty ? null : legacySnap.docs[0].ref;
  const linkedPurchaseSnap = snapshot.linkedPurchaseToken
    ? await subscriptions
        .where("purchase_token", "==", snapshot.linkedPurchaseToken)
        .where("app_id", "==", appId)
        .limit(1)
        .get()
    : null;
  const linkedPurchaseRef =
    linkedPurchaseSnap && !linkedPurchaseSnap.empty ? linkedPurchaseSnap.docs[0].ref : null;

  const linkStatus = await db.runTransaction(async (transaction) => {
    const targetDoc = await transaction.get(targetRef);
    const legacyDoc =
      legacyRef && legacyRef.path !== targetRef.path ? await transaction.get(legacyRef) : null;
    const linkedPurchaseDoc =
      linkedPurchaseRef &&
      linkedPurchaseRef.path !== targetRef.path &&
      linkedPurchaseRef.path !== legacyRef?.path
        ? await transaction.get(linkedPurchaseRef)
        : null;
    const targetData = targetDoc.data() as Record<string, unknown> | undefined;
    const legacyData = legacyDoc?.data() as Record<string, unknown> | undefined;
    const linkedPurchaseData = linkedPurchaseDoc?.data() as Record<string, unknown> | undefined;
    const existingData = (targetData ?? legacyData ?? linkedPurchaseData) as
      | Record<string, unknown>
      | undefined;
    const existingUserId = targetData?.user_id ?? legacyData?.user_id;

    resolvePurchaseLinkStatus(targetData?.user_id, userId);
    resolvePurchaseLinkStatus(legacyData?.user_id, userId);
    resolvePurchaseLinkStatus(linkedPurchaseData?.user_id, userId);
    const resolvedLinkStatus = resolvePurchaseLinkStatus(existingUserId, userId);

    const now = FieldValue.serverTimestamp();
    transaction.set(
      targetRef,
      {
        user_id: userId,
        app_id: appId,
        plan_type: snapshot.planType,
        purchase_token: purchaseToken,
        purchase_token_hash: hashPurchaseToken(purchaseToken),
        package_name: packageName,
        product_id: snapshot.productId,
        base_plan_id: snapshot.basePlanId,
        status: snapshot.status,
        google_subscription_state: snapshot.googleSubscriptionState,
        latest_order_id: snapshot.latestOrderId ?? null,
        linked_purchase_token_hash: snapshot.linkedPurchaseToken
          ? hashPurchaseToken(snapshot.linkedPurchaseToken)
          : null,
        starts_at: snapshot.startsAt,
        expires_at: snapshot.expiresAt,
        linked_at: existingData?.linked_at ?? now,
        verified_at: now,
        last_verified_at: now,
        raw_google_response: snapshot.purchaseData,
      },
      { merge: true }
    );

    if (legacyRef && legacyRef.path !== targetRef.path) {
      transaction.delete(legacyRef);
    }
    if (
      linkedPurchaseRef &&
      linkedPurchaseRef.path !== targetRef.path &&
      linkedPurchaseRef.path !== legacyRef?.path
    ) {
      transaction.set(
        linkedPurchaseRef,
        {
          status: "cancelled",
          google_subscription_state: "SUBSCRIPTION_STATE_CANCELED",
          replaced_by_token_hash: hashPurchaseToken(purchaseToken),
          last_verified_at: now,
        },
        { merge: true }
      );
    }

    return resolvedLinkStatus;
  });

  await logSubscriptionEvent({
    userId,
    appId,
    eventType: "verify_success",
    eventSource: "backend_verify",
    planType: snapshot.planType,
    productId: snapshot.productId,
    basePlanId: snapshot.basePlanId,
    purchaseToken,
    orderId: snapshot.latestOrderId,
    newStatus: snapshot.status,
    metadata: {
      link_status: linkStatus,
      expires_at: snapshot.expiresAt.toISOString(),
      google_subscription_state: snapshot.googleSubscriptionState,
      linked_purchase_token_hash: snapshot.linkedPurchaseToken
        ? hashPurchaseToken(snapshot.linkedPurchaseToken)
        : null,
    },
  });

  return {
    success: true,
    linkStatus,
    entitlementStatus: snapshot.status,
    planType: snapshot.planType,
    basePlanId: snapshot.basePlanId,
    productId: snapshot.productId,
    expiresAt: snapshot.expiresAt,
  };
}

export async function getActiveSubscription(
  userId: string,
  appId: string
): Promise<SubscriptionDoc | null> {
  const db = getFirestore();
  const now = Date.now();
  const snap = await db.collection("subscriptions").where("user_id", "==", userId).get();

  const eligible = snap.docs
    .map((doc) => doc.data() as SubscriptionDoc)
    .filter(
      (subscription) =>
        subscription.app_id === appId &&
        isCloudPremiumStatus(subscription.status) &&
        (toDate(subscription.expires_at)?.getTime() ?? 0) > now
    )
    .sort(
      (left, right) =>
        (toDate(right.expires_at)?.getTime() ?? 0) - (toDate(left.expires_at)?.getTime() ?? 0)
    );

  return eligible[0] ?? null;
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
  const snapshot = await fetchGooglePlaySubscriptionSnapshot(purchaseToken, productId, packageName);
  const targetRef = db
    .collection("subscriptions")
    .doc(subscriptionDocumentId(resolvedAppId, purchaseToken));
  const previousStatus = existingData?.status;
  const previousExpiry = toDate(existingData?.expires_at)?.getTime();
  const hasStatusChanged = previousStatus !== snapshot.status;
  const hasExpiryChanged = previousExpiry !== snapshot.expiresAt.getTime();
  const now = FieldValue.serverTimestamp();

  await targetRef.set(
    {
      user_id: resolvedUserId,
      app_id: resolvedAppId,
      plan_type: snapshot.planType,
      purchase_token: purchaseToken,
      purchase_token_hash: hashPurchaseToken(purchaseToken),
      package_name: packageName,
      product_id: snapshot.productId,
      base_plan_id: snapshot.basePlanId,
      status: snapshot.status,
      google_subscription_state: snapshot.googleSubscriptionState,
      latest_order_id: snapshot.latestOrderId ?? null,
      starts_at: snapshot.startsAt,
      expires_at: snapshot.expiresAt,
      verified_at: now,
      last_verified_at: now,
      raw_google_response: snapshot.purchaseData,
    },
    { merge: true }
  );

  if (existingDoc && existingDoc.ref.path !== targetRef.path) {
    await existingDoc.ref.delete();
  }

  if (triggerEventType || hasStatusChanged || hasExpiryChanged) {
    await logSubscriptionEvent({
      userId: resolvedUserId,
      appId: resolvedAppId,
      eventType:
        triggerEventType ??
        (hasStatusChanged
          ? isCloudPremiumStatus(snapshot.status)
            ? "renewed"
            : snapshot.status === "cancelled"
              ? "cancelled"
              : snapshot.status === "expired"
                ? "expired"
                : "plan_transition"
          : "plan_transition"),
      eventSource,
      planType: snapshot.planType,
      productId: snapshot.productId,
      basePlanId: snapshot.basePlanId,
      purchaseToken,
      orderId: snapshot.latestOrderId,
      oldStatus: previousStatus,
      newStatus: snapshot.status,
      metadata: {
        expires_at: snapshot.expiresAt.toISOString(),
        raw_event: rawEvent,
      },
    });
  }

  return {
    updated: hasStatusChanged || hasExpiryChanged || !existingDoc,
    appId: resolvedAppId,
    userId: resolvedUserId,
    productId: snapshot.productId,
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
  const snap = await db.collection("subscriptions").limit(limit).get();
  let updated = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as SubscriptionDoc;
    if (!data.purchase_token || !data.product_id) continue;

    try {
      const result = await reconcileSubscriptionFromGoogle({
        appId: data.app_id,
        userId: data.user_id ?? undefined,
        purchaseToken: data.purchase_token,
        productId: data.product_id,
        packageName: data.package_name ?? "com.sudoajay.descroll",
        eventSource: "google_play",
      });
      if (result.updated) updated += 1;
    } catch (error) {
      failed += 1;
      await logSubscriptionEvent({
        userId: data.user_id ?? "unknown",
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

  return { scanned: snap.size, updated, failed };
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "object") {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate();
  }
  return null;
}
