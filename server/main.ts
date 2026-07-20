import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { auth } from "./middleware/auth.ts";
import { requestLogger } from "./middleware/logger.ts";
import * as conversations from "./handlers/conversations.ts";
import * as chat from "./handlers/chat.ts";
import * as messages from "./handlers/messages.ts";
import * as jobs from "./handlers/jobs.ts";
import * as config from "./handlers/config.ts";
import { health } from "./handlers/health.ts";
import { closeDb, getDb } from "./db/db.ts";
import { start as startWorker } from "./worker/runner.ts";
import { events } from "./events/ws.ts";
import { log } from "./lib/log.ts";

// ── Database ──────────────────────────────────────────────────────────────────
getDb();
log.info("db: sqlite ready");

// ── Worker ────────────────────────────────────────────────────────────────────
startWorker();
log.info("worker: started");

// Graceful shutdown — close DB on SIGINT / SIGTERM.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  try {
    Deno.addSignalListener(signal, () => {
      log.info(`server: received ${signal}, shutting down`);
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
  log.error("unexpected error:", err);
  return c.json(
    { error: { code: "internal_error", message: "internal server error" } },
    500,
  );
});

// ── Request logging ───────────────────────────────────────────────────────
app.use("/api/*", requestLogger);

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

// ── Messages ─────────────────────────────────────────────────────────────────
app.patch("/api/messages/:id", auth, messages.updateMessage);
app.delete("/api/messages/:id", auth, messages.deleteMessage);
app.post("/api/messages/:id/regenerate", auth, messages.regenerateMessage);

// ── Jobs ─────────────────────────────────────────────────────────────────────
app.get("/api/jobs/:id", auth, jobs.getJob);
app.post("/api/jobs/:id/cancel", auth, jobs.cancelJob);

// ── Config ───────────────────────────────────────────────────────────────────
app.get("/api/config", auth, config.get);
app.put("/api/config", auth, config.put);

// ── WebSocket events ───────────────────────────────────────────────────────
app.get("/api/events", events);

// ── Static files (production) ────────────────────────────────────────────────
const distRoot = "./dist";

// Static UI assets produced by `pnpm build`.
app.use("/*", serveStatic({ root: distRoot }));

// SPA fallback — serve index.html for client-side routing.
app.get("*", async (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: { code: "not_found", message: "not found" } }, 404);
  }
  return new Response(await Deno.readTextFile(`${distRoot}/index.html`), {
    headers: { "Content-Type": "text/html" },
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
const port = Number(Deno.env.get("PORT") ?? 3000);
log.info(`Dante server listening on http://localhost:${port}`);
Deno.serve({ port }, app.fetch);
