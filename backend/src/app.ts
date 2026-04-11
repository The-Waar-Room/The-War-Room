import express from "express";
import cors from "cors";
import helmet from "helmet";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { userRouter } from "./routes/user";
import { chatRouter } from "./routes/chat";
import { subscriptionRouter } from "./routes/subscription";
import { adminRouter } from "./routes/admin";
import { ticketRouter } from "./routes/ticket";
import { soullensRouter } from "./routes/soullens";

const app = express();

// ── Security & parsing ──
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb" }));

// ── Request logging ──
app.use(requestLogger);

// ── Health check (no auth required) ──
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: process.env.npm_package_version ?? "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ──
app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);
app.use("/api/soullens", soullensRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/ticket", ticketRouter);
app.use("/api/admin", adminRouter);

// ── 404 fallback ──
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ── Global error handler ──
app.use(errorHandler);

export { app };
