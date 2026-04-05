import { Response, NextFunction } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth, getFirestore } from "../config/firebase";
import { AuthenticatedRequest, UserDoc } from "../types";

async function verifyBearerToken(req: AuthenticatedRequest): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("MISSING_OR_INVALID_TOKEN");
  }

  const token = authHeader.slice(7);
  const decoded = await getAuth().verifyIdToken(token);
  req.decodedToken = { uid: decoded.uid, email: decoded.email };
}

/**
 * Verifies Firebase JWT and attaches decoded token.
 * Use for endpoints where user doc may not exist yet (e.g. registration).
 */
export async function tokenAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await verifyBearerToken(req);
    next();
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "MISSING_OR_INVALID_TOKEN") {
      res.status(401).json({ success: false, error: "Missing or invalid token" });
      return;
    }

    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[tokenAuth] REJECT: verifyIdToken failed — ${msg}`);
    res.status(401).json({ success: false, error: "Authentication failed" });
  }
}

/**
 * Middleware 2: Verify Firebase JWT token from Authorization header.
 * - Extracts Bearer token
 * - Verifies with Firebase Admin SDK
 * - Looks up user in Firestore users collection
 * - Rejects if token invalid or user not found
 * - Attaches decodedToken and user to request
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await verifyBearerToken(req);

    // Look up user document
    const db = getFirestore();
    const userSnap = await db.collection("users").doc(req.decodedToken!.uid).get();

    if (!userSnap.exists) {
      const appId = req.appId;
      if (!appId) {
        res.status(404).json({ success: false, error: "User not registered" });
        return;
      }

      const now = FieldValue.serverTimestamp();
      await db
        .collection("users")
        .doc(req.decodedToken!.uid)
        .set({
          uid: req.decodedToken!.uid,
          app_id: appId,
          email: req.decodedToken!.email ?? "",
          created_at: now,
          last_seen: now,
        });

      const createdSnap = await db.collection("users").doc(req.decodedToken!.uid).get();
      req.user = createdSnap.data() as UserDoc;
      next();
      return;
    }

    const user = userSnap.data() as UserDoc;

    if (user.is_banned) {
      res.status(403).json({ success: false, error: "Account suspended" });
      return;
    }

    req.user = user;
    next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[authMiddleware] REJECT: verifyIdToken failed — ${msg}`);
    res.status(401).json({ success: false, error: "Authentication failed" });
  }
}
