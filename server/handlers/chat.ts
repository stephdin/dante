import type { Context } from "hono";
import { getDb } from "../db/db.ts";
import { getConfig } from "../db/config.ts";
import { push } from "../worker/queue.ts";
import { MAX_RETRIES } from "../worker/retry.ts";
import { broadcast } from "../events/broadcaster.ts";
import { notFound, badRequest } from "./_http.ts";
import type { MessagePart } from "../../shared/types.ts";

export async function sendChat(c: Context) {
  const db = getDb();
  const timestamp = new Date().toISOString();

  const body = await c.req.json<{
    conversationId?: string;
    text?: string;
    presetId?: string;
  }>();

  const conversationId = body.conversationId?.trim();
  if (!conversationId) return badRequest(c, "conversationId is required");

  const text = body.text?.trim();
  if (!text) return badRequest(c, "text is required");

  // Validate conversation exists (grab label too for auto-label check)
  const conv = db
    .prepare("SELECT id, label FROM conversations WHERE id = ?")
    .get<{ id: string; label: string }>(conversationId);
  if (!conv) return notFound(c, "conversation");

  // Resolve preset (from body, or default from config)
  const config = getConfig();
  let presetId = body.presetId?.trim();
  if (presetId) {
    if (!config.presets.some((p) => p.id === presetId)) {
      return badRequest(c, `preset "${presetId}" not found`);
    }
  } else {
    const defaultPreset = config.presets.find((p) => p.default);
    if (!defaultPreset) {
      return badRequest(
        c,
        "no default preset configured and no presetId provided",
      );
    }
    presetId = defaultPreset.id;
  }

  const userMessageId = crypto.randomUUID();
  const assistantMessageId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  const userParts: MessagePart[] = [{ type: "text", text }];

  // All writes in one transaction — no partial state on failure.
  db.transaction(() => {
    // Persist user message
    db.prepare(
      `INSERT INTO messages (id, conversation_id, role, parts, status, created_at)
       VALUES (?, ?, 'user', ?, 'complete', ?)`,
    ).run(userMessageId, conversationId, JSON.stringify(userParts), timestamp);

    // Auto-label: use first user message as label if it's still the default
    if (conv.label === "New conversation") {
      const label = text.slice(0, 60).trim();
      db.prepare("UPDATE conversations SET label = ? WHERE id = ?").run(
        label,
        conversationId,
      );
    }

    // Create assistant message row (spinner state)
    db.prepare(
      `INSERT INTO messages (id, conversation_id, role, parts, status, created_at)
       VALUES (?, ?, 'assistant', ?, 'generating', ?)`,
    ).run(assistantMessageId, conversationId, JSON.stringify([]), timestamp);

    // Bump conversation updated_at
    db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(
      timestamp,
      conversationId,
    );

    // Create job
    db.prepare(
      `INSERT INTO generation_jobs
       (id, conversation_id, message_id, preset_id, status, retry_count, max_retries, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
    ).run(
      jobId,
      conversationId,
      assistantMessageId,
      presetId,
      MAX_RETRIES,
      timestamp,
      timestamp,
    );
  })();

  // Broadcast after the transaction commits
  broadcast(conversationId, {
    type: "chat.user-message",
    conversationId,
    messageId: userMessageId,
    parts: userParts,
    createdAt: timestamp,
  });

  // Trigger the worker
  push(jobId);

  return c.json({ jobId, messageId: assistantMessageId, userMessageId });
}
