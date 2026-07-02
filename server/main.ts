import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import {
  appendMessage,
  config,
  conversations,
  createConversation,
  getConversation,
  resolveInstructions,
  resolveModel,
} from "./data.ts";
import { getStats, log, requestLogger, stats } from "./log.ts";
import type { ConversationSummary } from "../shared/types.ts";

const app = new Hono();

// Log every request, then allow the Vite dev server origin in dev.
app.use("/api/*", requestLogger());
app.use("/api/*", cors());

app.get("/api/health", (c) => c.json({ ok: true }));

// Basic in-memory statistics: request counts, chat totals, tokens, uptime.
app.get("/api/stats", (c) => c.json(getStats()));

app.get("/api/config", (c) => c.json(config));

app.get("/api/conversations", (c) => {
  const summaries: ConversationSummary[] = conversations.map((conv) => ({
    id: conv.id,
    label: conv.label,
    preview: conv.messages.at(-1)?.text ?? "",
    updatedAt: conv.updatedAt,
  }));
  return c.json(summaries);
});

app.get("/api/conversations/:id", (c) => {
  const conv = getConversation(c.req.param("id"));
  if (!conv) return c.json({ error: "not found" }, 404);
  return c.json(conv);
});

app.post("/api/conversations", (c) => {
  const conv = createConversation();
  return c.json({ id: conv.id }, 201);
});

// Join the text parts of a UIMessage into a single string (for persistence).
function uiMessageText(msg: UIMessage): string {
  let text = "";
  for (const part of msg.parts) {
    if (part.type === "text") text += part.text;
  }
  return text;
}

app.post("/api/chat", async (c) => {
  const { messages, conversationId, presetId } = await c.req.json<{
    messages: UIMessage[];
    conversationId: string;
    presetId?: string;
  }>();

  stats.chatRequests++;
  const modelId = resolveModel(presetId);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const preview = lastUser ? uiMessageText(lastUser).slice(0, 50) : "";
  log(
    "CHAT",
    `request conversation=${conversationId} preset=${presetId ?? "-"} model=${modelId} messages=${messages.length} userMsg="${preview}"`,
  );

  const conversation = getConversation(conversationId);
  if (!conversation) {
    log("CHAT", `rejected: conversation ${conversationId} not found`);
    return c.json({ error: "conversation not found" }, 404);
  }

  const apiKey = Deno.env.get("OPENCODE_API_KEY");
  if (!apiKey) {
    log("CHAT", "rejected: OPENCODE_API_KEY not set");
    return c.json({ error: "OPENCODE_API_KEY not set" }, 500);
  }

  // Persist the new user message before streaming so it survives a refresh.
  if (lastUser) {
    appendMessage(conversationId, {
      id: crypto.randomUUID(),
      role: "user",
      text: uiMessageText(lastUser),
      createdAt: new Date().toISOString(),
    });
  }

  // OpenCode Go exposes an OpenAI-compatible /v1/chat/completions endpoint.
  // Model ids (e.g. "glm-5.2") are passed straight through from the config.
  // A custom fetch logs the raw upstream request body for debugging.
  const provider = createOpenAICompatible({
    name: "opencode-go",
    apiKey,
    baseURL: "https://opencode.ai/zen/go/v1",
    fetch: async (input, init) => {
      if (init?.body) {
        log("REQ_OUT", `→ ${String(input)}\n${init.body}`);
      }
      return fetch(input, init);
    },
  });

  const streamStart = performance.now();
  let chunkCount = 0;
  let firstTokenMs: number | null = null;

  const result = streamText({
    model: provider.chatModel(modelId),
    instructions: resolveInstructions(presetId),
    messages: await convertToModelMessages(messages),
    onError({ error }) {
      stats.chatErrors++;
      stats.lastError = String(error);
      log("CHAT", `error: ${String(error)}`);
    },
    onChunk({ chunk }) {
      if (chunk.type === "text-delta" || chunk.type === "reasoning-delta") {
        chunkCount++;
        stats.totalChunks++;
        if (firstTokenMs === null) {
          firstTokenMs = Math.round(performance.now() - streamStart);
          log("CHAT", `first token (${firstTokenMs}ms)`);
        }
      }
    },
    onEnd({ text, usage }) {
      const durationMs = Math.round(performance.now() - streamStart);
      const tokens = usage?.outputTokens ?? 0;
      if (tokens > 0) stats.totalOutputTokens += tokens;
      log(
        "CHAT",
        `stream ended (${durationMs}ms, ${chunkCount} chunks, ${tokens} output tokens)`,
      );
      appendMessage(conversationId, {
        id: crypto.randomUUID(),
        role: "assistant",
        text,
        createdAt: new Date().toISOString(),
      });
    },
  });

  log("CHAT", "stream started");
  return createUIMessageStreamResponse({
    // Forward reasoning tokens (e.g. from GLM-5.2, DeepSeek V4 Pro) so the
    // client can render the model's thinking alongside the answer.
    stream: toUIMessageStream({ stream: result.stream, sendReasoning: true }),
  });
});

log("SERVER", "listening on http://localhost:3000");
Deno.serve({ port: 3000 }, app.fetch);
