import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";

import { createConversation } from "./handlers/createConversation.ts";
import { createProvider, deleteProvider, updateProvider } from "./handlers/config/providers.ts";
import { createAssistant, deleteAssistant, updateAssistant } from "./handlers/config/assistants.ts";
import { createMcp, deleteMcp, updateMcp } from "./handlers/config/mcps.ts";
import { createPreset, deletePreset, updatePreset } from "./handlers/config/presets.ts";
import { getConfig } from "./handlers/getConfig.ts";
import { getConversation } from "./handlers/getConversation.ts";
import { getConversations } from "./handlers/getConversations.ts";
import { getHealth } from "./handlers/getHealth.ts";
import { streamChat } from "./handlers/streamChat.ts";
import { AppError } from "./lib/errors.ts";
import { log, requestLogger } from "./lib/log.ts";
import { getDb } from "./repositories/sqlite/db.ts";

// Open the SQLite DB eagerly. The repo modules (imported transitively via the
// handler imports below) also call getDb(), which is idempotent — whichever
// runs first opens the DB and migrations; the other calls return the cached
// instance. Calling it here makes a bad config fail before Deno.serve binds.
const db = getDb();
log("SERVER", "sqlite database ready");

const app = new Hono();

// Attempt graceful close on shutdown. SIGINT covers Ctrl+C; SIGTERM covers
// process managers. Deno doesn't fire these on Windows for `deno task`, but
// WAL mode is crash-safe so an unclosed DB on Windows is harmless — the WAL
// journal recovers on the next open.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  try {
    Deno.addSignalListener(signal, () => {
      try { db.close(); } catch { /* already closed */ }
      Deno.exit(0);
    });
  } catch {
    // Signal listeners aren't supported on all platforms; ignore.
  }
}

// Log every request, then allow the Vite dev server origin in dev.
app.use("/api/*", requestLogger());
app.use("/api/*", cors());

// --- Health ---
app.get("/api/health", getHealth);

// --- Config ---
app.get("/api/config", getConfig);

// --- Config mutations ---
// Providers
app.post("/api/config/providers", createProvider);
app.put("/api/config/providers/:id", updateProvider);
app.delete("/api/config/providers/:id", deleteProvider);
// Assistants
app.post("/api/config/assistants", createAssistant);
app.put("/api/config/assistants/:id", updateAssistant);
app.delete("/api/config/assistants/:id", deleteAssistant);
// MCPs
app.post("/api/config/mcps", createMcp);
app.put("/api/config/mcps/:id", updateMcp);
app.delete("/api/config/mcps/:id", deleteMcp);
// Presets
app.post("/api/config/presets", createPreset);
app.put("/api/config/presets/:id", updatePreset);
app.delete("/api/config/presets/:id", deletePreset);

// --- Conversations ---
app.get("/api/conversations", getConversations);
app.get("/api/conversations/:id", getConversation);
app.post("/api/conversations", createConversation);

// --- Chat ---
app.post("/api/chat", streamChat);

// Map domain errors to HTTP responses; everything else is a 500.
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.status as ContentfulStatusCode);
  }
  if (err instanceof ZodError) {
    return c.json({ error: "Validation failed", issues: err.issues }, 422);
  }
  log("ERROR", `unexpected error: ${String(err)}`);
  return c.json({ error: "internal server error" }, 500);
});

log("SERVER", "listening on http://localhost:3000");
Deno.serve({ port: 3000 }, app.fetch);
