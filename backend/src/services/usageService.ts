import { getRedis } from "../config/redis";

interface TrackUsageParams {
  userId: string;
  appId: string;
  isToolCall?: boolean;
}

/**
 * Increment the user's daily message counter in Redis (expires at midnight IST).
 * Returns the new count, or 0 if Redis is unavailable.
 */
export async function trackUsage(params: TrackUsageParams): Promise<number> {
  const { userId, appId, isToolCall } = params;

  const todayIST = getTodayIST();
  const redisKey = `rate:${userId}:${appId}:${todayIST}`;

  // ── Redis: increment counter and set expiry ──
  const redis = getRedis();
  let newCount = 0;
  if (redis) {
    try {
      if (isToolCall) {
        newCount = (await redis.get<number>(redisKey)) ?? 0;
      } else {
        newCount = await redis.incr(redisKey);
        if (newCount === 1) {
          const secondsUntilMidnight = getSecondsUntilMidnightIST();
          await redis.expire(redisKey, secondsUntilMidnight);
        }
      }
    } catch (error) {
      console.error("[usage] Redis write failed:", error);
    }
  }

  return newCount;
}

/**
 * Get current daily message count from Redis.
 */
export async function getDailyCount(userId: string, appId: string): Promise<number> {
  const todayIST = getTodayIST();
  const redisKey = `rate:${userId}:${appId}:${todayIST}`;
  const redis = getRedis();
  if (!redis) return 0;
  try {
    return (await redis.get<number>(redisKey)) ?? 0;
  } catch {
    return 0;
  }
}

/** Returns today's date string in IST (UTC+5:30) as YYYY-MM-DD */
function getTodayIST(): string {
  const now = new Date();
  const istOffset = 330 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

/** Seconds remaining until next midnight IST */
function getSecondsUntilMidnightIST(): number {
  const now = new Date();
  const istOffset = 330 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);

  const midnight = new Date(istNow);
  midnight.setHours(24, 0, 0, 0);

  return Math.ceil((midnight.getTime() - istNow.getTime()) / 1000);
}
