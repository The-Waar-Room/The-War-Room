import { Response, NextFunction } from "express";
import { createHash } from "crypto";
import { getFirestore } from "../config/firebase";
import { AuthenticatedRequest, AppDoc } from "../types";

function canonicalizeAppId(appId: string): string {
  const normalized = appId.trim().toLowerCase();

  if (normalized === "descroll") {
    return "deScroll";
  }

  return normalized;
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
    const appIdCandidates = Array.from(new Set([appId.trim(), appId.trim().toLowerCase()]));

    let appSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    for (const candidate of appIdCandidates) {
      const candidateSnap = await db.collection("apps").doc(candidate).get();
      if (candidateSnap.exists) {
        appSnap = candidateSnap;
        break;
      }
    }

    if (!appSnap?.exists) {
      console.warn(`[appVerify] REJECT: App doc not found for appId="${appId}"`);
      res.status(401).json({ success: false, error: "Invalid app credentials" });
      return;
    }

    const appDoc = appSnap.data() as AppDoc;

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

    req.appId = canonicalizeAppId(appId);
    req.appDoc = appDoc;
    next();
  } catch (err) {
    console.error("[appVerify] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
