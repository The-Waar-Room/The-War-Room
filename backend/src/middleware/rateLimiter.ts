import { Response, NextFunction } from "express";
import { getRedis } from "../config/redis";
import { getGlobalConfig } from "../config/configCache";
import { getFirestore } from "../config/firebase";
import { AuthenticatedRequest, PlanType } from "../types";

/**
 * Middleware 4: Rate limiting via Upstash Redis.
 * - Builds key: "rate:{user_id}:{app_id}:{YYYY-MM-DD}"
 * - Reads current count from Redis
 * - Reads plan limits from cached config/global
 * - If count >= limit, returns 429
 * - Attaches planType and planLimits to request
 *
 * Rate check runs BEFORE calling Vertex AI — never waste tokens.
 */
export async function rateLimiter(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.decodedToken!.uid;
    const appId = req.appId!;

    // Determine user's plan
    const planType = await getUserPlan(userId, appId);
    const config = await getGlobalConfig();
    const planLimits = config.plans[planType];

    if (!planLimits) {
      res.status(500).json({ success: false, error: "Internal server error" });
      return;
    }

    // Build daily rate key (IST = UTC+5:30)
    const todayIST = getTodayIST();
    const redisKey = `rate:${userId}:${appId}:${todayIST}`;

    const redis = getRedis();
    const currentCount = (await redis.get<number>(redisKey)) ?? 0;

    if (currentCount >= planLimits.daily_messages) {
      res.status(429).json({
        success: false,
        error: "Daily message limit reached. Upgrade your plan for more messages.",
        usage: {
          messagesUsedToday: currentCount,
          dailyLimit: planLimits.daily_messages,
          remaining: 0,
          plan: planType,
        },
      });
      return;
    }

    req.planType = planType;
    req.planLimits = planLimits;
    next();
  } catch (err) {
    console.error("[rateLimiter] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * Looks up the user's active subscription for the given app.
 * Returns "free" if no active subscription found.
 */
async function getUserPlan(userId: string, appId: string): Promise<PlanType> {
  const db = getFirestore();
  const now = new Date();

  const subSnap = await db
    .collection("subscriptions")
    .where("user_id", "==", userId)
    .where("app_id", "==", appId)
    .where("status", "==", "active")
    .where("expires_at", ">", now)
    .orderBy("expires_at", "desc")
    .limit(1)
    .get();

  if (subSnap.empty) {
    return "free";
  }

  return subSnap.docs[0].data().plan_type as PlanType;
}

/** Returns today's date string in IST (UTC+5:30) as YYYY-MM-DD */
function getTodayIST(): string {
  const now = new Date();
  // IST offset: +5:30 = +330 minutes
  const istOffset = 330 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}
