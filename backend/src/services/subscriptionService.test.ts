import assert from "node:assert/strict";
import test from "node:test";
import {
  isCloudPremiumStatus,
  normalizeSubscriptionStatus,
  PurchaseOwnershipConflictError,
  resolvePurchaseLinkStatus,
  snapshotFromGooglePurchase,
} from "./subscriptionService";

test("maps Google subscription states to cloud entitlement states", () => {
  assert.equal(normalizeSubscriptionStatus("SUBSCRIPTION_STATE_ACTIVE"), "active");
  assert.equal(normalizeSubscriptionStatus("SUBSCRIPTION_STATE_IN_GRACE_PERIOD"), "grace_period");
  assert.equal(normalizeSubscriptionStatus("SUBSCRIPTION_STATE_ON_HOLD"), "on_hold");
  assert.equal(normalizeSubscriptionStatus("SUBSCRIPTION_STATE_PAUSED"), "paused");
  assert.equal(normalizeSubscriptionStatus("SUBSCRIPTION_STATE_CANCELED"), "cancelled");
  assert.equal(normalizeSubscriptionStatus("SUBSCRIPTION_STATE_EXPIRED"), "expired");
  assert.equal(normalizeSubscriptionStatus(undefined), "unknown");
});

test("only active and grace-period subscriptions receive cloud premium", () => {
  assert.equal(isCloudPremiumStatus("active"), true);
  assert.equal(isCloudPremiumStatus("grace_period"), true);
  assert.equal(isCloudPremiumStatus("pending"), false);
  assert.equal(isCloudPremiumStatus("on_hold"), false);
  assert.equal(isCloudPremiumStatus("cancelled"), false);
  assert.equal(isCloudPremiumStatus("expired"), false);
});

test("derives the six-month plan from the v2 line item", () => {
  const snapshot = snapshotFromGooglePurchase(
    {
      startTime: "2026-06-06T03:00:00Z",
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [
        {
          productId: "premium_access",
          expiryTime: "2026-12-06T03:00:00Z",
          latestSuccessfulOrderId: "GPA.1234-5678-9012-34567",
          offerDetails: { basePlanId: "premium-six-month" },
        },
      ],
    },
    "premium_access"
  );

  assert.equal(snapshot.planType, "sixmonth");
  assert.equal(snapshot.basePlanId, "premium-six-month");
  assert.equal(snapshot.productId, "premium_access");
  assert.equal(snapshot.status, "active");
  assert.equal(snapshot.expiresAt.toISOString(), "2026-12-06T03:00:00.000Z");
});

test("derives monthly and yearly plans without trusting client plan data", () => {
  const monthly = snapshotFromGooglePurchase({
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    lineItems: [
      {
        productId: "premium_access",
        expiryTime: "2026-07-06T03:00:00Z",
        offerDetails: { basePlanId: "premium-monthly" },
      },
    ],
  });
  const yearly = snapshotFromGooglePurchase({
    subscriptionState: "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    lineItems: [
      {
        productId: "premium_access",
        expiryTime: "2027-06-06T03:00:00Z",
        offerDetails: { basePlanId: "premium-yearly" },
      },
    ],
  });

  assert.equal(monthly.planType, "monthly");
  assert.equal(yearly.planType, "yearly");
  assert.equal(yearly.status, "grace_period");
});

test("keeps purchase ownership idempotent and rejects another Firebase UID", () => {
  assert.equal(resolvePurchaseLinkStatus(undefined, "uid-one"), "linked");
  assert.equal(resolvePurchaseLinkStatus("uid-one", "uid-one"), "already_linked");
  assert.throws(
    () => resolvePurchaseLinkStatus("uid-one", "uid-two"),
    PurchaseOwnershipConflictError
  );
});
