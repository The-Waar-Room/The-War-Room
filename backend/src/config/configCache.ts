import { getFirestore } from "./firebase";
import { GlobalConfig } from "../types";

let cachedConfig: GlobalConfig | null = null;
let lastFetchedAt = 0;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns global config with 5-minute in-memory cache.
 * Falls back to stale cache if Firestore read fails.
 */
export async function getGlobalConfig(): Promise<GlobalConfig> {
  const now = Date.now();

  if (cachedConfig && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const db = getFirestore();
    const snap = await db.collection("config").doc("global").get();

    if (!snap.exists) {
      throw new Error("config/global document not found in Firestore");
    }

    cachedConfig = snap.data() as GlobalConfig;
    lastFetchedAt = now;
    return cachedConfig;
  } catch (err) {
    // Stale-if-error: return old cache if available
    if (cachedConfig) {
      console.warn("[configCache] Firestore read failed, using stale cache:", err);
      return cachedConfig;
    }
    throw err;
  }
}
