import { Response, NextFunction } from "express";
import { getAuth, getFirestore } from "../config/firebase";
import { AuthenticatedRequest, UserDoc } from "../types";

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
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "Missing or invalid token" });
      return;
    }

    const token = authHeader.slice(7);
    const decoded = await getAuth().verifyIdToken(token);

    req.decodedToken = { uid: decoded.uid, email: decoded.email };

    // Look up user document
    const db = getFirestore();
    const userSnap = await db.collection("users").doc(decoded.uid).get();

    if (!userSnap.exists) {
      res.status(404).json({ success: false, error: "User not registered" });
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
