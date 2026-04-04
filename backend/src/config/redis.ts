import { Redis } from "@upstash/redis";

let redis: Redis;

export async function initRedis(): Promise<void> {
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN are required");
  }

  redis = new Redis({ url, token });

  // Verify connection
  const pong = await redis.ping();
  if (pong !== "PONG") {
    throw new Error(`Redis ping failed: ${pong}`);
  }

  console.log("[redis] Connected to Upstash Redis");
}

export function getRedis(): Redis {
  if (!redis) throw new Error("Redis not initialized — call initRedis() first");
  return redis;
}
