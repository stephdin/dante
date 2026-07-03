import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { createConversation } from "./handlers/createConversation.ts";
import { getConfig } from "./handlers/getConfig.ts";
import { getConversation } from "./handlers/getConversation.ts";
import { getConversations } from "./handlers/getConversations.ts";
import { getHealth } from "./handlers/getHealth.ts";
import { streamChat } from "./handlers/streamChat.ts";
import { AppError } from "./lib/errors.ts";
import { log, requestLogger } from "./lib/log.ts";

const app = new Hono();

// Log every request, then allow the Vite dev server origin in dev.
app.use("/api/*", requestLogger());
app.use("/api/*", cors());

// --- Health ---
app.get("/api/health", getHealth);

// --- Config ---
app.get("/api/config", getConfig);

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
  log("ERROR", `unexpected error: ${String(err)}`);
  return c.json({ error: "internal server error" }, 500);
});

log("SERVER", "listening on http://localhost:3000");
Deno.serve({ port: 3000 }, app.fetch);
