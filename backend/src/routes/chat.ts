import { Router, Response } from "express";
import { appVerify } from "../middleware/appVerify";
import { authMiddleware } from "../middleware/authMiddleware";
import { killSwitch } from "../middleware/killSwitch";
import { rateLimiter } from "../middleware/rateLimiter";
import { chat } from "../services/geminiService";
import { trackUsage } from "../services/usageService";
import { AuthenticatedRequest, ChatRequestBody } from "../types";

export const chatRouter = Router();

/**
 * POST /api/chat
 * Full AI chat flow with all middleware in correct order.
 * Middleware: appVerify → authMiddleware → killSwitch → rateLimiter
 */
chatRouter.post(
  "/",
  appVerify,
  authMiddleware,
  killSwitch,
  rateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { message, sessionId, context, history } = req.body as ChatRequestBody;

      // ── Input validation ──
      if (!message || typeof message !== "string") {
        res.status(400).json({ success: false, error: "Message is required" });
        return;
      }
      if (message.length > 1000) {
        res.status(400).json({ success: false, error: "Message too long (max 1000 chars)" });
        return;
      }
      if (!sessionId || typeof sessionId !== "string") {
        res.status(400).json({ success: false, error: "Session ID is required" });
        return;
      }

      const userId = req.decodedToken!.uid;
      const appId = req.appId!;
      const appName = req.appDoc!.app_name;
      const planType = req.planType!;
      const planLimits = req.planLimits!;

      // ── Call Gemini ──
      const result = await chat({
        userId,
        appId,
        appName,
        sessionId,
        message,
        context,
        planType,
        maxInputTokens: planLimits.max_input_tokens,
        maxOutputTokens: planLimits.max_output_tokens,
        history,
      });

      // ── Track usage (Redis + Firestore) ──
      const messagesUsedToday = await trackUsage({
        userId,
        appId,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
      });

      // ── Return response ──
      res.json({
        success: true,
        response: result.response,
        usage: {
          messagesUsedToday,
          dailyLimit: planLimits.daily_messages,
          remaining: Math.max(0, planLimits.daily_messages - messagesUsedToday),
          plan: planType,
        },
      });
    } catch (err) {
      console.error("[chat] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);
