import { getFirestore } from "../config/firebase";
import { getRedis } from "../config/redis";
import { FieldValue } from "firebase-admin/firestore";

// Gemini 2.5 Flash pricing (per 1M tokens, standard mode)
const INPUT_COST_PER_MILLION = 0.15; // USD
const OUTPUT_COST_PER_MILLION = 0.6; // USD

interface TrackUsageParams {
  userId: string;
  appId: string;
  tokenInput: number;
  tokenOutput: number;
}

/**
 * Atomically increment usage counters in Firestore and Redis.
 * - Redis: increment daily rate counter + set expiry to midnight IST
 * - Firestore: increment ai_usage document counters (atomic)
 */
export async function trackUsage(params: TrackUsageParams): Promise<number> {
  const { userId, appId, tokenInput, tokenOutput } = params;

  const todayIST = getTodayIST();
  const redisKey = `rate:${userId}:${appId}:${todayIST}`;

  // ── Redis: increment counter and set expiry ──
  const redis = getRedis();
  const newCount = await redis.incr(redisKey);

  // Set expiry to next midnight IST if this is the first message today
  if (newCount === 1) {
    const secondsUntilMidnight = getSecondsUntilMidnightIST();
    await redis.expire(redisKey, secondsUntilMidnight);
  }

  // ── Firestore: atomic usage update ──
  const costUsd =
    (tokenInput / 1_000_000) * INPUT_COST_PER_MILLION +
    (tokenOutput / 1_000_000) * OUTPUT_COST_PER_MILLION;

  const db = getFirestore();
  const docId = `${userId}_${appId}_${todayIST}`;
  const usageRef = db.collection("ai_usage").doc(docId);

  await usageRef.set(
    {
      user_id: userId,
      app_id: appId,
      date: todayIST,
      message_count: FieldValue.increment(1),
      token_input: FieldValue.increment(tokenInput),
      token_output: FieldValue.increment(tokenOutput),
      cost_usd: FieldValue.increment(costUsd),
    },
    { merge: true }
  );

  return newCount;
}

/**
 * Get current daily message count from Redis.
 */
export async function getDailyCount(userId: string, appId: string): Promise<number> {
  const todayIST = getTodayIST();
  const redisKey = `rate:${userId}:${appId}:${todayIST}`;
  const redis = getRedis();
  return (await redis.get<number>(redisKey)) ?? 0;
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
