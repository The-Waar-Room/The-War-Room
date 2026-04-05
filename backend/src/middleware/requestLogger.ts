import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Assigns a unique request ID and logs method, path, and duration.
 * Request ID is returned in x-request-id header for client-side tracing.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const start = Date.now();

  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const extended = req as unknown as {
      appId?: string;
      decodedToken?: { uid?: string };
    };
    console.log(
      JSON.stringify({
        requestId,
        method: req.method,
        path: req.originalUrl,
        routePath: req.path,
        status: res.statusCode,
        durationMs: duration,
        appId: extended.appId ?? null,
        uid: extended.decodedToken?.uid ?? null,
      })
    );
  });

  next();
}
