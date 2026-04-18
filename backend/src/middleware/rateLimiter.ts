import { Response, NextFunction } from "express";
import { getRedis } from "../config/redis";
import { getGlobalConfig } from "../config/configCache";
import { getFirestore } from "../config/firebase";
import { AuthenticatedRequest, PlanType, toConfigPlan } from "../types";

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
    const configPlan = toConfigPlan(planType);
    const planLimits = config.plans[configPlan];

    if (!planLimits) {
      res.status(500).json({ success: false, error: "Internal server error" });
      return;
    }

    // Build daily rate key (IST = UTC+5:30)
    const todayIST = getTodayIST();
    const redisKey = `rate:${userId}:${appId}:${todayIST}`;

    const redis = getRedis();
    let currentCount = 0;
    try {
      currentCount = (await redis.get<number>(redisKey)) ?? 0;
    } catch (err) {
      console.error(`[rateLimiter] Redis read failed for key=${redisKey}:`, err);
      // Fail-open for availability: allow this request if Redis is temporarily unavailable.
      currentCount = 0;
    }

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
export async function getUserPlan(userId: string, appId: string): Promise<PlanType> {
  const db = getFirestore();
  const now = new Date();

  // Query by user_id only to avoid composite-index dependency in hot-path chat requests.
  const subSnap = await db.collection("subscriptions").where("user_id", "==", userId).get();

  if (subSnap.empty) {
    return "free";
  }

  const active = subSnap.docs
    .map((doc) => doc.data() as Record<string, unknown>)
    .filter((doc) => doc.app_id === appId && doc.status === "active")
    .map((doc) => {
      const expiresAt = toDate(doc.expires_at);
      return {
        planType: doc.plan_type as PlanType | undefined,
        expiresAt,
      };
    })
    .filter(
      (sub): sub is { planType: PlanType | undefined; expiresAt: Date } =>
        sub.expiresAt !== null && sub.expiresAt.getTime() > now.getTime()
    )
    .sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());

  if (active.length === 0) {
    return "free";
  }

  return active[0].planType ?? "free";
}

function toDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object" && value !== null) {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === "function") {
      const date = maybeTimestamp.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

/** Returns today's date string in IST (UTC+5:30) as YYYY-MM-DD */
export function getTodayIST(): string {
  const now = new Date();
  // IST offset: +5:30 = +330 minutes
  const istOffset = 330 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}
