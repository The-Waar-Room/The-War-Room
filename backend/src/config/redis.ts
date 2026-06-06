import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export async function initRedis(): Promise<void> {
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    console.warn("[redis] Credentials unavailable; continuing without Redis");
    redis = null;
    return;
  }

  const candidate = new Redis({ url, token });

  // Verify connection
  const pong = await candidate.ping();
  if (pong !== "PONG") {
    throw new Error(`Redis ping failed: ${pong}`);
  }

  redis = candidate;
  console.log("[redis] Connected to Upstash Redis");
}

export function getRedis(): Redis | null {
  return redis;
}
