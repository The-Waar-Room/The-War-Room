import { Router, Response } from "express";
import { appVerify } from "../middleware/appVerify";
import { authMiddleware } from "../middleware/authMiddleware";
import { killSwitch } from "../middleware/killSwitch";
import { rateLimiter, getUserPlan, getTodayIST } from "../middleware/rateLimiter";
import { chat } from "../services/geminiService";
import { moderateChatMessage } from "../services/chatModerationService";
import { trackUsage } from "../services/usageService";
import { AuthenticatedRequest, ChatRequestBody, toConfigPlan } from "../types";
import { getGlobalConfig } from "../config/configCache";
import { getRedis } from "../config/redis";

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

      // ── Track usage (Redis daily counter) ──
      try {
        const messagesUsedToday = await trackUsage({
          userId,
          appId,
          isToolCall: req.body.isToolCall,
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
        dataRequest: result.dataRequest,
        usage,
      });
    } catch (err) {
      console.error("[chat] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

/**
 * GET /api/chat/usage
 * Returns current daily usage without sending a message.
 * Middleware: appVerify → authMiddleware
 */
chatRouter.get(
  "/usage",
  appVerify,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.decodedToken!.uid;
      const appId = req.appId!;

      const planType = await getUserPlan(userId, appId);
      const config = await getGlobalConfig();
      const configPlan = toConfigPlan(planType);
      const planLimits = config.plans[configPlan];

      const todayIST = getTodayIST();
      const redisKey = `rate:${userId}:${appId}:${todayIST}`;

      const redis = getRedis();
      let currentCount = 0;
      try {
        if (!redis) throw new Error("Redis unavailable");
        currentCount = (await redis.get<number>(redisKey)) ?? 0;
      } catch {
        currentCount = 0;
      }

      res.json({
        success: true,
        usage: {
          messagesUsedToday: currentCount,
          dailyLimit: planLimits.daily_messages,
          remaining: Math.max(0, planLimits.daily_messages - currentCount),
          plan: planType,
        },
      });
    } catch (err) {
      console.error("[chat/usage] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);
