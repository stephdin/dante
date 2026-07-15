import { Hono } from "hono";
import { auth } from "./middleware/auth.ts";
import { logger } from "./middleware/logger.ts";
import * as conversations from "./handlers/conversations.ts";
import * as chat from "./handlers/chat.ts";
import * as jobs from "./handlers/jobs.ts";
import * as config from "./handlers/config.ts";
import { health } from "./handlers/health.ts";
import { getDb, closeDb } from "./db/db.ts";
import { start as startWorker } from "./worker/runner.ts";
import { events } from "./events/ws.ts";

// ── Database ──────────────────────────────────────────────────────────────────
getDb();
console.log("db: sqlite ready");

// ── Worker ────────────────────────────────────────────────────────────────────
startWorker();
console.log("worker: started");

// Graceful shutdown — close DB on SIGINT / SIGTERM.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  try {
    Deno.addSignalListener(signal, () => {
      closeDb();
      Deno.exit(0);
    });
  } catch {
    // Signal listeners aren't supported on all platforms; ignore.
  }
}

const app = new Hono();

// ── Error handling ───────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error("unexpected error:", err);
  return c.json(
    { error: { code: "internal_error", message: "internal server error" } },
    500,
  );
});

// ── Request logging ───────────────────────────────────────────────────────
app.use("/api/*", logger);

// ── Health (no auth) ─────────────────────────────────────────────────────────
app.get("/api/health", health);

// ── Conversations ────────────────────────────────────────────────────────────
app.get("/api/conversations", auth, conversations.listConversations);
app.get("/api/conversations/:id", auth, conversations.getConversation);
app.post("/api/conversations", auth, conversations.createConversation);
app.patch("/api/conversations/:id", auth, conversations.updateConversation);
app.delete("/api/conversations/:id", auth, conversations.deleteConversation);

// ── Chat ─────────────────────────────────────────────────────────────────────
app.post("/api/chat", auth, chat.sendChat);

// ── Jobs ─────────────────────────────────────────────────────────────────────
app.get("/api/jobs/:id", auth, jobs.getJob);
app.post("/api/jobs/:id/cancel", auth, jobs.cancelJob);

// ── Config ───────────────────────────────────────────────────────────────────
app.get("/api/config", auth, config.get);
app.put("/api/config", auth, config.put);

// ── WebSocket events ───────────────────────────────────────────────────────
app.get("/api/events", events);

// ── Root ─────────────────────────────────────────────────────────────────────
app.get("/", (c) => c.text("Hello from Dante!"));

// ── Start ────────────────────────────────────────────────────────────────────
const port = Number(Deno.env.get("PORT") ?? 3000);
console.log(`Dante server listening on http://localhost:${port}`);
Deno.serve({ port }, app.fetch);
