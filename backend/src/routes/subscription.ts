import { Router, Response } from "express";
import { appVerify } from "../middleware/appVerify";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  verifyGooglePlaySubscription,
  getActiveSubscription,
} from "../services/subscriptionService";
import { AuthenticatedRequest, SubscriptionVerifyBody } from "../types";

export const subscriptionRouter = Router();

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
      const { purchaseToken, productId, packageName } = req.body as SubscriptionVerifyBody;

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

      const userId = req.decodedToken!.uid;
      const appId = req.appId!;

      const result = await verifyGooglePlaySubscription(
        userId,
        appId,
        purchaseToken,
        productId,
        packageName
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
