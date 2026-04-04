import { Request, Response, NextFunction } from "express";

/**
 * Global error handler — catches unhandled errors from route handlers.
 * Returns generic error message to client (never expose internals).
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error("[errorHandler]", err);
  res.status(500).json({ success: false, error: "Internal server error" });
}
