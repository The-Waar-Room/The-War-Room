import { Response, NextFunction } from "express";
import { getGlobalConfig } from "../config/configCache";
import { AuthenticatedRequest } from "../types";

/**
 * Middleware 3 (chat only): Check global kill switch.
 * - Reads config/global from cached Firestore document
 * - If kill_switch is true, returns 503 maintenance message
 * - Applied only to /api/chat route
 */
export async function killSwitch(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const config = await getGlobalConfig();

    if (config.kill_switch) {
      res.status(503).json({
        success: false,
        error: "AI service is temporarily unavailable for maintenance",
      });
      return;
    }

    next();
  } catch (err) {
    console.error("[killSwitch] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
