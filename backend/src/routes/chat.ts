import { Router, Response } from "express";
import { createHash } from "crypto";
import { appVerify } from "../middleware/appVerify";
import { authMiddleware } from "../middleware/authMiddleware";
import { killSwitch } from "../middleware/killSwitch";
import { rateLimiter } from "../middleware/rateLimiter";
import { chat } from "../services/geminiService";
import { moderateChatMessage } from "../services/chatModerationService";
import { trackUsage } from "../services/usageService";
import { writeChatEvent } from "../services/chatEventService";
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
      if (message.length > 2000) {
        res.status(400).json({ success: false, error: "Message too long (max 2000 chars)" });
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

      // ── Prepare context snapshot + hash for analytics ──
      const contextJson = context ? JSON.stringify(context) : "";
      const contextPreview = contextJson.slice(0, 512);
      const contextHash = createHash("sha256").update(contextJson).digest("hex");
      const promptPreview = message.slice(0, 160);

      const requestStart = Date.now();
      const moderation = moderateChatMessage(message, appId, appName);

      if (moderation.action !== "allow") {
        res.json({
          success: true,
          response: moderation.response,
          followUpSuggestions: moderation.followUpSuggestions ?? [],
          usage: null,
          moderation: {
            action: moderation.action,
            category: moderation.category,
          },
        });

        writeChatEvent({
          userId,
          appId,
          sessionId,
          promptPreview,
          response: moderation.response ?? "",
          contextPreview,
          contextHash,
          tokenInput: 0,
          tokenOutput: 0,
          planType,
          status: "success",
          latencyMs: Date.now() - requestStart,
          moderationAction: moderation.action,
          moderationCategory: moderation.category,
        }).catch((err: unknown) => console.error("[chat] writeChatEvent failed:", err));
        return;
      }

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

      let usage: {
        messagesUsedToday: number;
        dailyLimit: number;
        remaining: number;
        plan: typeof planType;
      } | null = null;

      // ── Track usage (Redis + Firestore) ──
      try {
        const messagesUsedToday = await trackUsage({
          userId,
          appId,
          tokenInput: result.tokenInput,
          tokenOutput: result.tokenOutput,
        });

        usage = {
          messagesUsedToday,
          dailyLimit: planLimits.daily_messages,
          remaining: Math.max(0, planLimits.daily_messages - messagesUsedToday),
          plan: planType,
        };
      } catch (trackErr) {
        console.error("[chat] trackUsage failed:", trackErr);
      }

      // ── Return response ──
      res.json({
        success: true,
        response: result.response,
        followUpSuggestions: result.followUpSuggestions,
        usage,
      });

      // ── Fire-and-forget: write chat event for admin drilldown ──
      writeChatEvent({
        userId,
        appId,
        sessionId,
        promptPreview,
        response: result.response,
        contextPreview,
        contextHash,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
        planType,
        status: "success",
        latencyMs: Date.now() - requestStart,
        moderationAction: moderation.action,
        moderationCategory: moderation.category,
      }).catch((err: unknown) => console.error("[chat] writeChatEvent failed:", err));
    } catch (err) {
      console.error("[chat] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);
