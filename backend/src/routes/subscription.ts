import { Router, Response } from "express";
import { appVerify } from "../middleware/appVerify";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  logSubscriptionEvent,
  reconcileActiveSubscriptions,
  reconcileSubscriptionFromGoogle,
  verifyGooglePlaySubscription,
  getActiveSubscription,
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

/**
 * POST /api/subscription/verify
 * Verify a Google Play purchase server-side.
 * Middleware: appVerify → authMiddleware
 */
subscriptionRouter.post(
  "/verify",
  appVerify,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { purchaseToken, productId, packageName, basePlanId } = req.body as SubscriptionVerifyBody;

      // ── Input validation ──
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
      if (!basePlanId || typeof basePlanId !== "string") {
        res.status(400).json({ success: false, error: "basePlanId is required" });
        return;
      }

      const userId = req.decodedToken!.uid;
      const appId = req.appId!;

      const result = await verifyGooglePlaySubscription(
        userId,
        appId,
        purchaseToken,
        productId,
        packageName,
        basePlanId
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: "Payment verification failed",
          status: result.status,
        });
        return;
      }

      res.json({
        success: true,
        plan_type: result.plan_type,
        expires_at: result.expires_at.toISOString(),
        status: result.status,
      });
    } catch (err) {
      console.error("[subscription/verify] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

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
        expires_at: sub.expires_at,
      });
    } catch (err) {
      console.error("[subscription/status] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);
