import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";

import { createAssistant, deleteAssistant, updateAssistant } from "./handlers/config/assistants.ts";
import { createMcp, deleteMcp, updateMcp } from "./handlers/config/mcps.ts";
import { createPreset, deletePreset, updatePreset } from "./handlers/config/presets.ts";
import { createProvider, deleteProvider, updateProvider } from "./handlers/config/providers.ts";
import { createConversation } from "./handlers/createConversation.ts";
import { getConfig } from "./handlers/getConfig.ts";
import { getConversation } from "./handlers/getConversation.ts";
import { getConversations } from "./handlers/getConversations.ts";
import { getHealth } from "./handlers/getHealth.ts";
import { streamChat } from "./handlers/streamChat.ts";
import { AppError } from "./lib/errors.ts";
import { log, requestLogger } from "./lib/log.ts";
import { getDb } from "./repositories/sqlite/db.ts";
import { createSqliteConfigRepository } from "./repositories/sqlite/configSqlite.ts";
import { createSqliteConversationRepository } from "./repositories/sqlite/conversationSqlite.ts";
import { createConfigService } from "./services/configService.ts";
import { createConversationService } from "./services/conversationService.ts";
import { createChatService } from "./services/chatService.ts";

// ── Composition root ──────────────────────────────────────────────────────
// All wiring lives here. The DB is the only process-wide singleton; everything
// else (repositories, services, handlers) is constructed explicitly and
// injected, so tests can build their own graph against an isolated :memory:
// DB without bypassing any module-eval-time state.

// Open the SQLite DB eagerly. Idempotent — getDb() returns the cached instance
// on subsequent calls. Calling it here makes a bad config fail before
// Deno.serve binds.
const db = getDb();
log("SERVER", "sqlite database ready");

// Surface a missing model API key at boot rather than discovering it on the
// first /api/chat request. We warn (not fail) so config-only setups still
// boot; chatService re-checks the passed value per request and throws 500 if
// it's still unset when a chat turn actually fires.
const modelApiKey = Deno.env.get("MODEL_PROVIDER_API_KEY");
if (!modelApiKey) {
  log(
    "SERVER",
    "warning: MODEL_PROVIDER_API_KEY not set — /api/chat will reject until it is",
  );
}

// Construct the dependency graph: db → repositories → services → handlers.
const configRepository = createSqliteConfigRepository(db);
const conversationRepository = createSqliteConversationRepository(db);

const configService = createConfigService(configRepository);
const conversationService = createConversationService(conversationRepository);
const chatService = createChatService({
  configService,
  conversationRepo: conversationRepository,
  modelProviderApiKey: modelApiKey,
});

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
// CORS: restrict to a known origin list. Defaults to the Vite dev server so
// `pnpm dev` works out of the box; set CORS_ORIGIN (comma-separated) in
// production to the frontend origin(s). Requests without an Origin header
// (curl, server-to-server) aren't subject to CORS at all.
const allowedOrigins = (Deno.env.get("CORS_ORIGIN") ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use("/api/*", cors({ origin: allowedOrigins }));

// --- Health ---
app.get("/api/health", getHealth);

// --- Config ---
app.get("/api/config", getConfig(configService));

// --- Config mutations ---
// Providers
app.post("/api/config/providers", createProvider(configService));
app.put("/api/config/providers/:id", updateProvider(configService));
app.delete("/api/config/providers/:id", deleteProvider(configService));
// Assistants
app.post("/api/config/assistants", createAssistant(configService));
app.put("/api/config/assistants/:id", updateAssistant(configService));
app.delete("/api/config/assistants/:id", deleteAssistant(configService));
// MCPs
app.post("/api/config/mcps", createMcp(configService));
app.put("/api/config/mcps/:id", updateMcp(configService));
app.delete("/api/config/mcps/:id", deleteMcp(configService));
// Presets
app.post("/api/config/presets", createPreset(configService));
app.put("/api/config/presets/:id", updatePreset(configService));
app.delete("/api/config/presets/:id", deletePreset(configService));

// --- Conversations ---
app.get("/api/conversations", getConversations(conversationService));
app.get("/api/conversations/:id", getConversation(conversationService));
app.post("/api/conversations", createConversation(conversationService));

// --- Chat ---
app.post("/api/chat", streamChat(chatService));

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

const port = Number(Deno.env.get("PORT") ?? 3000);
log("SERVER", `listening on http://localhost:${port}`);
Deno.serve({ port }, app.fetch);