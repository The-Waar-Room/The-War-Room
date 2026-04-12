import { Response, NextFunction } from "express";
import { createHash } from "crypto";
import { getFirestore } from "../config/firebase";
import { AuthenticatedRequest, AppDoc } from "../types";

const DESCROLL_APP_ID = "deScroll";
const SOULLENS_APP_ID = "soullens";

function normalizeAppKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function canonicalizeAppId(appId: string): string {
  const normalized = normalizeAppKey(appId);

  if (normalized === normalizeAppKey(DESCROLL_APP_ID)) {
    return DESCROLL_APP_ID;
  }

  if (normalized === normalizeAppKey(SOULLENS_APP_ID)) {
    return SOULLENS_APP_ID;
  }

  return appId.trim();
}

/**
 * Middleware 1: Verify x-app-id + x-app-secret headers.
 * - Looks up app document in Firestore apps collection
 * - Hashes provided secret with SHA-256 and compares to stored secret_hash
 * - Rejects if app not found, inactive, or secret mismatch
 * - Attaches appId and appDoc to request
 */
export async function appVerify(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const appId = req.headers["x-app-id"] as string | undefined;
    const appSecret = req.headers["x-app-secret"] as string | undefined;

    if (!appId || !appSecret) {
      console.warn(
        `[appVerify] REJECT: Missing headers — x-app-id=${!!appId}, x-app-secret=${!!appSecret}`
      );
      res.status(401).json({ success: false, error: "Missing app credentials" });
      return;
    }

    const db = getFirestore();
    const canonicalAppId = canonicalizeAppId(appId);
    const normalizedInput = normalizeAppKey(appId);
    const normalizedCanonical = normalizeAppKey(canonicalAppId);

    const appSnap = await db.collection("apps").get();
    const matchedApp = appSnap.docs.find((doc) => {
      const appData = doc.data() as AppDoc;
      const candidateKeys = [doc.id, appData.app_id, appData.app_name]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .map((value) => normalizeAppKey(value));

      return (
        candidateKeys.includes(normalizedInput) ||
        candidateKeys.includes(normalizedCanonical)
      );
    });

    if (!matchedApp?.exists) {
      console.warn(`[appVerify] REJECT: App doc not found for appId="${appId}"`);
      res.status(401).json({ success: false, error: "Invalid app credentials" });
      return;
    }

    const appDoc = matchedApp.data() as AppDoc;

    if (!appDoc.is_active) {
      res.status(403).json({ success: false, error: "App is disabled" });
      return;
    }

    const secretHash = createHash("sha256").update(appSecret).digest("hex");
    if (secretHash !== appDoc.secret_hash) {
      console.warn(
        `[appVerify] REJECT: Secret mismatch for appId="${appId}" — computed=${secretHash.slice(0, 8)}… stored=${appDoc.secret_hash?.slice(0, 8)}…`
      );
      res.status(401).json({ success: false, error: "Invalid app credentials" });
      return;
    }

    req.appId = canonicalAppId;
    req.appDoc = appDoc;
    next();
  } catch (err) {
    console.error("[appVerify] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
