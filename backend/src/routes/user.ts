import { Router, Response } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { appVerify } from "../middleware/appVerify";
import { authMiddleware } from "../middleware/authMiddleware";
import { getFirestore } from "../config/firebase";
import { AuthenticatedRequest } from "../types";

export const userRouter = Router();

/**
 * POST /api/user/register
 * Create user document in Firestore after Firebase signup.
 * Middleware: appVerify → authMiddleware
 */
userRouter.post(
  "/register",
  appVerify,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const uid = req.decodedToken!.uid;
      const email = req.decodedToken!.email ?? "";
      const appId = req.appId!;

      const db = getFirestore();
      const userRef = db.collection("users").doc(uid);
      const existing = await userRef.get();

      if (existing.exists) {
        // Update last_seen instead of creating duplicate
        await userRef.update({ last_seen: FieldValue.serverTimestamp() });
        res.json({ success: true, message: "User already registered" });
        return;
      }

      await userRef.set({
        uid,
        app_id: appId,
        email,
        created_at: FieldValue.serverTimestamp(),
        last_seen: FieldValue.serverTimestamp(),
      });

      res.status(201).json({ success: true, message: "User registered" });
    } catch (err) {
      console.error("[user/register] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);
