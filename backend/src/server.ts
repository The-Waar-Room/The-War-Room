import { app } from "./app";
import { loadSecrets } from "./config/secrets";
import { initFirebase } from "./config/firebase";
import { initRedis } from "./config/redis";
import { initVertexAI } from "./config/vertexai";

const PORT = parseInt(process.env.PORT ?? "8080", 10);

async function start(): Promise<void> {
  console.log("[startup] Loading secrets...");
  await loadSecrets();

  console.log("[startup] Initializing Firebase...");
  initFirebase();

  console.log("[startup] Initializing Redis...");
  await initRedis();

  console.log("[startup] Initializing Vertex AI...");
  initVertexAI();

  const server = app.listen(PORT, () => {
    console.log(`[startup] Server listening on port ${PORT}`);
  });

  // ── Graceful shutdown ──
  const shutdown = (signal: string) => {
    console.log(`[shutdown] Received ${signal}, closing server...`);
    server.close(() => {
      console.log("[shutdown] Server closed");
      process.exit(0);
    });
    // Force exit after 10s if graceful shutdown stalls
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
