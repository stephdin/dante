import type { Context } from "hono";
import { getDb } from "../db/db.ts";
import { push } from "../worker/queue.ts";
import { broadcast } from "../events/broadcaster.ts";
import type { Config, MessagePart } from "../../shared/types.ts";

type ConversationRow = { id: string };

export async function sendChat(c: Context) {
  const db = getDb();
  const now = () => new Date().toISOString();

  const body = await c.req.json<{
    conversationId?: string;
    text?: string;
    presetId?: string;
  }>();

  const conversationId = body.conversationId?.trim();
  if (!conversationId) {
    return c.json(
      { error: { code: "bad_request", message: "conversationId is required" } },
      400,
    );
  }

  const text = body.text?.trim();
  if (!text) {
    return c.json(
      { error: { code: "bad_request", message: "text is required" } },
      400,
    );
  }

  // Validate conversation exists
  const conv = db
    .prepare("SELECT id FROM conversations WHERE id = ?")
    .get<ConversationRow>(conversationId);
  if (!conv) {
    return c.json(
      { error: { code: "not_found", message: "conversation not found" } },
      404,
    );
  }

  // Resolve preset (from body, or default from config)
  let presetId = body.presetId?.trim();
  if (!presetId) {
    const configRow = db
      .prepare("SELECT json FROM config WHERE id = 1")
      .get<{ json: string }>();
    const config = JSON.parse(configRow!.json) as Config;
    const defaultPreset = config.presets.find((p) => p.default);
    if (!defaultPreset) {
      return c.json(
        {
          error: {
            code: "bad_request",
            message: "no default preset configured and no presetId provided",
          },
        },
        400,
      );
    }
    presetId = defaultPreset.id;
  }

  const timestamp = now();

  // Persist user message
  const userMessageId = crypto.randomUUID();
  const userParts: MessagePart[] = [{ type: "text", text }];
  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, parts, status, created_at)
     VALUES (?, ?, 'user', ?, 'complete', ?)`,
  ).run(userMessageId, conversationId, JSON.stringify(userParts), timestamp);

  // Auto-label: use first user message as label if it's still the default
  const labelRow = db
    .prepare("SELECT label FROM conversations WHERE id = ?")
    .get<{ label: string }>(conversationId);
  if (labelRow?.label === "New conversation") {
    const label = text.slice(0, 60).trim();
    db.prepare("UPDATE conversations SET label = ? WHERE id = ?").run(
      label,
      conversationId,
    );
  }

  broadcast(conversationId, {
    type: "chat.user-message",
    conversationId,
    messageId: userMessageId,
    parts: userParts,
    createdAt: timestamp,
  });

  // Create assistant message row (spinner state)
  const assistantMessageId = crypto.randomUUID();
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
  const jobId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO generation_jobs
     (id, conversation_id, message_id, preset_id, status, retry_count, max_retries, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', 0, 3, ?, ?)`,
  ).run(
    jobId,
    conversationId,
    assistantMessageId,
    presetId,
    timestamp,
    timestamp,
  );

  // Trigger the worker
  push(jobId);

  return c.json({ jobId, messageId: assistantMessageId, userMessageId });
}
