import { Router, Response } from "express";
import { appVerify } from "../middleware/appVerify";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  logSubscriptionEvent,
  reconcileActiveSubscriptions,
  reconcileSubscriptionFromGoogle,
  verifyGooglePlaySubscription,
  getActiveSubscription,
  hashPurchaseToken,
  PurchaseOwnershipConflictError,
  PurchaseVerificationError,
} from "../services/subscriptionService";
import { AuthenticatedRequest, SubscriptionEventBody, SubscriptionVerifyBody } from "../types";

export const subscriptionRouter = Router();

interface PubSubPushBody {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
}

function verifyWebhookSecret(secret: string | undefined): boolean {
  const configuredSecret = process.env.GOOGLE_PLAY_WEBHOOK_SECRET;
  return Boolean(configuredSecret) && secret === configuredSecret;
}

function mapNotificationTypeToEventType(notificationType?: number) {
  switch (notificationType) {
    case 1:
    case 2:
      return "renewed" as const;
    case 3:
      return "cancelled" as const;
    case 4:
      return "purchase_started" as const;
    case 12:
      return "revoked" as const;
    case 13:
      return "expired" as const;
    case 20:
      return "purchase_cancelled" as const;
    default:
      return "webhook_received" as const;
  }
}

/**
 * POST /api/subscription/google-play-notification
 * Receives Pub/Sub push payloads for Google Play real-time developer notifications.
 * Auth: x-webhook-secret header must match GOOGLE_PLAY_WEBHOOK_SECRET.
 */
subscriptionRouter.post("/google-play-notification", async (req, res: Response): Promise<void> => {
  const webhookSecret = req.headers["x-webhook-secret"] as string | undefined;
  if (!verifyWebhookSecret(webhookSecret)) {
    res.status(401).json({ success: false, error: "Invalid webhook secret" });
    return;
  }

  try {
    const body = req.body as PubSubPushBody;
    const encodedData = body.message?.data;

    if (!encodedData) {
      res.status(400).json({ success: false, error: "Missing Pub/Sub message data" });
      return;
    }

    const decoded = JSON.parse(Buffer.from(encodedData, "base64").toString("utf8")) as {
      packageName?: string;
      eventTimeMillis?: string;
      subscriptionNotification?: {
        notificationType?: number;
        purchaseToken?: string;
        subscriptionId?: string;
      };
    };

    const packageName = decoded.packageName;
    const purchaseToken = decoded.subscriptionNotification?.purchaseToken;
    const productId = decoded.subscriptionNotification?.subscriptionId;

    if (!packageName || !purchaseToken || !productId) {
      res
        .status(400)
        .json({ success: false, error: "Missing Google Play subscription identifiers" });
      return;
    }

    const triggerEventType = mapNotificationTypeToEventType(
      decoded.subscriptionNotification?.notificationType
    );

    const result = await reconcileSubscriptionFromGoogle({
      purchaseToken,
      productId,
      packageName,
      eventSource: "google_play",
      triggerEventType,
      rawEvent: {
        messageId: body.message?.messageId,
        publishTime: body.message?.publishTime,
        subscription: body.subscription,
        notificationType: decoded.subscriptionNotification?.notificationType,
        eventTimeMillis: decoded.eventTimeMillis,
      },
    });

    res.json({
      success: true,
      status: result.status,
      updated: result.updated,
      app_id: result.appId,
    });
  } catch (err) {
    console.error("[subscription/google-play-notification] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * POST /api/subscription/reconcile
 * Rechecks active subscriptions against Google Play without requiring the app to open.
 * Auth: x-webhook-secret header must match GOOGLE_PLAY_WEBHOOK_SECRET.
 */
subscriptionRouter.post("/reconcile", async (req, res: Response): Promise<void> => {
  const webhookSecret = req.headers["x-webhook-secret"] as string | undefined;
  if (!verifyWebhookSecret(webhookSecret)) {
    res.status(401).json({ success: false, error: "Invalid reconcile secret" });
    return;
  }

  try {
    const limitRaw = req.body?.limit;
    const limit = typeof limitRaw === "number" ? limitRaw : 100;
    const result = await reconcileActiveSubscriptions(limit);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[subscription/reconcile] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

async function linkSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { purchaseToken, productId, packageName } = req.body as SubscriptionVerifyBody;

    if (!purchaseToken || typeof purchaseToken !== "string") {
      res.status(400).json({ success: false, error: "purchaseToken is required" });
      return;
    }
    if (!productId || typeof productId !== "string") {
      res.status(400).json({ success: false, error: "productId is required" });
      return;
    }
    if (!packageName || typeof packageName !== "string") {
      res.status(400).json({ success: false, error: "packageName is required" });
      return;
    }
    const userId = req.decodedToken!.uid;
    const appId = req.appId!;
    const purchaseTokenHash = hashPurchaseToken(purchaseToken);

    console.log(
      JSON.stringify({
        event: "subscription_link_started",
        appId,
        uid: userId,
        productId,
        packageName,
        purchaseTokenHash,
      })
    );

    const result = await verifyGooglePlaySubscription(
      userId,
      appId,
      purchaseToken,
      productId,
      packageName
    );

    console.log(
      JSON.stringify({
        event: "subscription_link_success",
        appId,
        uid: userId,
        productId: result.productId,
        packageName,
        purchaseTokenHash,
        linkStatus: result.linkStatus,
        entitlementStatus: result.entitlementStatus,
        planType: result.planType,
        basePlanId: result.basePlanId,
        expiresAt: result.expiresAt.toISOString(),
      })
    );

    res.json({
      success: true,
      linkStatus: result.linkStatus,
      entitlementStatus: result.entitlementStatus,
      planType: result.planType,
      basePlanId: result.basePlanId,
      expiresAt: result.expiresAt.toISOString(),
      // Compatibility fields for app versions using /verify.
      plan_type: result.planType,
      expires_at: result.expiresAt.toISOString(),
      status: result.entitlementStatus,
    });
  } catch (err) {
    if (err instanceof PurchaseOwnershipConflictError) {
      console.warn(
        JSON.stringify({
          event: "subscription_link_conflict",
          appId: req.appId ?? null,
          uid: req.decodedToken?.uid ?? null,
          productId: req.body?.productId ?? null,
          packageName: req.body?.packageName ?? null,
          purchaseTokenHash:
            typeof req.body?.purchaseToken === "string"
              ? hashPurchaseToken(req.body.purchaseToken)
              : null,
        })
      );
      res.status(409).json({
        success: false,
        error: "purchase_linked_to_another_account",
        linkStatus: "conflict",
      });
      return;
    }
    if (err instanceof PurchaseVerificationError) {
      const purchaseTokenForLog =
        typeof req.body?.purchaseToken === "string" ? req.body.purchaseToken : undefined;
      const productIdForLog =
        typeof req.body?.productId === "string" ? req.body.productId : undefined;
      const packageNameForLog =
        typeof req.body?.packageName === "string" ? req.body.packageName : undefined;

      if (req.decodedToken?.uid && req.appId) {
        await logSubscriptionEvent({
          userId: req.decodedToken.uid,
          appId: req.appId,
          eventType: "verify_failed",
          eventSource: "backend_verify",
          productId: productIdForLog,
          purchaseToken: purchaseTokenForLog,
          newStatus: "unknown",
          metadata: {
            reason: err.reason,
            upstream_status: err.upstreamStatus ?? null,
            message: err.message,
            package_name: packageNameForLog ?? null,
          },
        });
      }

      console.warn(
        JSON.stringify({
          event: "subscription_link_rejected",
          reason: err.reason,
          upstreamStatus: err.upstreamStatus ?? null,
          message: err.message,
          appId: req.appId ?? null,
          uid: req.decodedToken?.uid ?? null,
          productId: productIdForLog ?? null,
          packageName: packageNameForLog ?? null,
          purchaseTokenHash: purchaseTokenForLog ? hashPurchaseToken(purchaseTokenForLog) : null,
        })
      );
      res.status(400).json({
        success: false,
        error: "purchase_verification_failed",
        verificationReason: err.reason,
        upstreamStatus: err.upstreamStatus ?? null,
        verificationMessage: err.message,
      });
      return;
    }
    console.error("[subscription/link] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * POST /api/subscription/link
 * Verifies a Play purchase and links it to the authenticated Firebase UID.
 */
subscriptionRouter.post("/link", appVerify, authMiddleware, linkSubscription);

/**
 * Compatibility endpoint for released clients. Client plan/payment fields are ignored.
 */
subscriptionRouter.post("/verify", appVerify, authMiddleware, linkSubscription);

/**
 * POST /api/subscription/event
 * Persist non-authoritative client or backend lifecycle events for audit history.
 * Middleware: appVerify → authMiddleware
 */
subscriptionRouter.post(
  "/event",
  appVerify,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        eventType,
        eventSource,
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
      } = req.body as SubscriptionEventBody;

      if (!eventType || typeof eventType !== "string") {
        res.status(400).json({ success: false, error: "eventType is required" });
        return;
      }

      const userId = req.decodedToken!.uid;
      const appId = req.appId!;

      const parsedOccurredAt = occurredAt ? new Date(occurredAt) : undefined;
      if (parsedOccurredAt && Number.isNaN(parsedOccurredAt.getTime())) {
        res.status(400).json({ success: false, error: "occurredAt must be a valid ISO date" });
        return;
      }

      await logSubscriptionEvent({
        userId,
        appId,
        eventType,
        eventSource,
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
        occurredAt: parsedOccurredAt,
        metadata,
      });

      res.json({ success: true });
    } catch (err) {
      console.error("[subscription/event] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

/**
 * GET /api/subscription/status
 * Get the user's current active plan details.
 * Middleware: appVerify → authMiddleware
 */
subscriptionRouter.get(
  "/status",
  appVerify,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.decodedToken!.uid;
      const appId = req.appId!;

      const sub = await getActiveSubscription(userId, appId);

      if (!sub) {
        res.json({
          success: true,
          plan_type: "free",
          status: "active",
          expires_at: null,
        });
        return;
      }

      res.json({
        success: true,
        plan_type: sub.plan_type,
        status: sub.status,
        product_id: sub.product_id,
        base_plan_id: sub.base_plan_id,
        expires_at: sub.expires_at,
      });
    } catch (err) {
      console.error("[subscription/status] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);
