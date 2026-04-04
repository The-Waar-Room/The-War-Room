import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getFirestore } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

export const adminRouter = Router();

// ── Admin JWT verification (separate from Firebase user auth) ──
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Admin token required" });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ success: false, error: "Internal server error" });
    return;
  }

  try {
    jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid admin token" });
  }
}

// All admin routes require admin JWT
adminRouter.use(adminAuth);

/**
 * GET /api/admin/dashboard
 * Summary stats: total users, active subscriptions, today's AI usage.
 */
adminRouter.get("/dashboard", async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();

    const [usersSnap, subsSnap] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("subscriptions").where("status", "==", "active").count().get(),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: usersSnap.data().count,
        activeSubscriptions: subsSnap.data().count,
      },
    });
  } catch (err) {
    console.error("[admin/dashboard] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/admin/users
 * List users with optional filters: app_id, limit, offset.
 */
adminRouter.get("/users", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const appId = req.query.app_id as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    let query: FirebaseFirestore.Query = db.collection("users");

    if (appId) {
      query = query.where("app_id", "==", appId);
    }

    query = query.orderBy("created_at", "desc").offset(offset).limit(limit);

    const snap = await query.get();
    const users = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data: users, count: users.length });
  } catch (err) {
    console.error("[admin/users] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/admin/usage
 * AI usage stats with optional filters: app_id, date, user_id.
 */
adminRouter.get("/usage", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const appId = req.query.app_id as string | undefined;
    const date = req.query.date as string | undefined;
    const userId = req.query.user_id as string | undefined;

    let query: FirebaseFirestore.Query = db.collection("ai_usage");

    if (appId) query = query.where("app_id", "==", appId);
    if (date) query = query.where("date", "==", date);
    if (userId) query = query.where("user_id", "==", userId);

    query = query.limit(100);

    const snap = await query.get();
    const usage = snap.docs.map((doc) => doc.data());

    // Aggregate totals
    const totals = usage.reduce(
      (acc, u) => ({
        messages: acc.messages + (u.message_count || 0),
        tokenInput: acc.tokenInput + (u.token_input || 0),
        tokenOutput: acc.tokenOutput + (u.token_output || 0),
        costUsd: acc.costUsd + (u.cost_usd || 0),
      }),
      { messages: 0, tokenInput: 0, tokenOutput: 0, costUsd: 0 }
    );

    res.json({ success: true, data: usage, totals });
  } catch (err) {
    console.error("[admin/usage] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * POST /api/admin/ban-user
 * Ban a user from using AI. Body: { uid: string }
 */
adminRouter.post("/ban-user", async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.body as { uid?: string };
    if (!uid || typeof uid !== "string") {
      res.status(400).json({ success: false, error: "uid is required" });
      return;
    }

    const db = getFirestore();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    await userRef.update({ is_banned: true });
    res.json({ success: true, message: "User banned" });
  } catch (err) {
    console.error("[admin/ban-user] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * POST /api/admin/kill-switch
 * Enable or disable AI globally. Body: { enabled: boolean }
 */
adminRouter.post("/kill-switch", async (req: Request, res: Response): Promise<void> => {
  try {
    const { enabled } = req.body as { enabled?: boolean };
    if (typeof enabled !== "boolean") {
      res.status(400).json({ success: false, error: "enabled (boolean) is required" });
      return;
    }

    const db = getFirestore();
    await db.collection("config").doc("global").update({
      kill_switch: enabled,
      _updated_at: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: enabled ? "AI disabled globally" : "AI enabled globally",
    });
  } catch (err) {
    console.error("[admin/kill-switch] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
