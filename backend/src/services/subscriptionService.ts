import { google } from "googleapis";
import { getFirestore } from "../config/firebase";
import { PRODUCT_TO_PLAN, SubscriptionDoc } from "../types";
import { FieldValue } from "firebase-admin/firestore";

interface VerifyResult {
  success: boolean;
  plan_type: string;
  expires_at: Date;
  status: string;
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
  packageName: string
): Promise<VerifyResult> {
  // ── Authenticate with Google APIs ──
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  const androidPublisher = google.androidpublisher({ version: "v3", auth });

  // ── Call Google Play Developer API ──
  const response = await androidPublisher.purchases.subscriptions.get({
    packageName,
    subscriptionId: productId,
    token: purchaseToken,
  });

  const purchaseData = response.data;

  // paymentState: 0 = pending, 1 = received, 2 = free trial, 3 = deferred
  if (purchaseData.paymentState !== 1 && purchaseData.paymentState !== 2) {
    return {
      success: false,
      plan_type: "free",
      expires_at: new Date(),
      status: "payment_not_received",
    };
  }

  // ── Map product to plan ──
  const mapping = PRODUCT_TO_PLAN[productId];
  if (!mapping) {
    throw new Error(`Unknown productId: ${productId}`);
  }

  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + mapping.days * 24 * 60 * 60 * 1000);

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
    status: "active",
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

  return {
    success: true,
    plan_type: mapping.plan,
    expires_at: expiresAt,
    status: "active",
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
