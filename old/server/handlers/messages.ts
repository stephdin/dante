import type { Context } from "hono";
import { getDb } from "../db/db.ts";
import { getConfig } from "../db/config.ts";
import { rowToMessage } from "../db/rows.ts";
import type { MessageRow } from "../db/rows.ts";
import { broadcast } from "../events/broadcaster.ts";
import { cancelJobById } from "./jobs.ts";
import { notFound, badRequest } from "./_http.ts";
import { push } from "../worker/queue.ts";
import { MAX_RETRIES } from "../worker/retry.ts";

function now(): string {
  return new Date().toISOString();
}

/** Validate the requested preset, falling back to the configured default. */
function resolvePresetId(presetId: string | null): string | null {
  const config = getConfig();
  if (presetId && config.presets.some((p) => p.id === presetId)) {
    return presetId;
  }
  const defaultPreset = config.presets.find((p) => p.default);
  return defaultPreset?.id ?? null;
}

/** Cancel any pending/running/failed generation job for a message. */
function cancelActiveJob(messageId: string) {
  const db = getDb();
  const job = db
    .prepare(
      "SELECT * FROM generation_jobs WHERE message_id = ? AND status IN ('pending', 'running', 'failed')",
    )
    .get<{ id: string }>(messageId);
  if (job) cancelJobById(job.id);
}

/** PATCH /api/messages/:id — toggle the starred flag. */
export async function updateMessage(c: Context) {
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json<{ starred?: boolean }>();

  const row = db.prepare("SELECT * FROM messages WHERE id = ?").get<MessageRow>(id);
  if (!row) return notFound(c, "message");

  if (typeof body.starred !== "boolean") {
    return badRequest(c, "starred is required");
  }

  db.prepare("UPDATE messages SET starred = ? WHERE id = ?").run(
    body.starred ? 1 : 0,
    id,
  );

  const updated = db.prepare("SELECT * FROM messages WHERE id = ?").get<MessageRow>(id)!;
  const message = rowToMessage(updated);
  broadcast(updated.conversation_id, { type: "chat.message-updated", message });
  return c.json(message);
}

/** DELETE /api/messages/:id — remove a message. */
export async function deleteMessage(c: Context) {
  const db = getDb();
  const id = c.req.param("id");

  const row = db.prepare("SELECT * FROM messages WHERE id = ?").get<MessageRow>(id);
  if (!row) return notFound(c, "message");

  // Stop any in-flight generation before the cascade delete removes the job.
  if (row.role === "assistant") {
    cancelActiveJob(id);
  }

  db.prepare("DELETE FROM messages WHERE id = ?").run(id);
  db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(
    now(),
    row.conversation_id,
  );

  broadcast(row.conversation_id, { type: "chat.message-deleted", messageId: id });
  return c.json(null);
}

/** POST /api/messages/:id/regenerate — re-create the assistant response. */
export async function regenerateMessage(c: Context) {
  const db = getDb();
  const id = c.req.param("id");
  const ts = now();

  const row = db.prepare("SELECT * FROM messages WHERE id = ?").get<MessageRow>(id);
  if (!row) return notFound(c, "message");

  const presetId = resolvePresetId(row.preset_id);
  if (!presetId) {
    return badRequest(c, "message has no preset and no default preset is configured");
  }

  if (row.role === "assistant") {
    return regenerateAssistant(c, row, presetId);
  }

  // role === "user"
  // If the user message already has an assistant reply, regenerate that reply.
  const existingAssistant = db
    .prepare(
      "SELECT * FROM messages WHERE conversation_id = ? AND role = 'assistant' AND created_at > ? ORDER BY created_at ASC LIMIT 1",
    )
    .get<MessageRow>(row.conversation_id, row.created_at);

  if (existingAssistant) {
    const assistantPresetId = resolvePresetId(existingAssistant.preset_id) ?? presetId;
    return regenerateAssistant(c, existingAssistant, assistantPresetId);
  }

  // Otherwise create a brand-new assistant placeholder.
  const assistantId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO messages (id, conversation_id, role, parts, status, created_at, preset_id, starred) VALUES (?, ?, 'assistant', ?, 'generating', ?, ?, 0)",
  ).run(assistantId, row.conversation_id, JSON.stringify([]), ts, presetId);

  const jobId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO generation_jobs
     (id, conversation_id, message_id, preset_id, status, retry_count, max_retries, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
  ).run(jobId, row.conversation_id, assistantId, presetId, MAX_RETRIES, ts, ts);

  db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(
    ts,
    row.conversation_id,
  );

  push(jobId);

  const created = db.prepare("SELECT * FROM messages WHERE id = ?").get<MessageRow>(assistantId)!;
  broadcast(row.conversation_id, { type: "chat.message-created", message: rowToMessage(created) });

  return c.json({ messageId: assistantId });
}

function regenerateAssistant(c: Context, row: MessageRow, presetId: string) {
  const db = getDb();
  const ts = now();
  const id = row.id;

  cancelActiveJob(id);

  db.prepare(
    "UPDATE messages SET parts = ?, status = 'generating', stats = NULL WHERE id = ?",
  ).run(JSON.stringify([]), id);

  const jobId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO generation_jobs
     (id, conversation_id, message_id, preset_id, status, retry_count, max_retries, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
  ).run(jobId, row.conversation_id, id, presetId, MAX_RETRIES, ts, ts);

  db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(
    ts,
    row.conversation_id,
  );

  push(jobId);

  const updated = db.prepare("SELECT * FROM messages WHERE id = ?").get<MessageRow>(id)!;
  broadcast(row.conversation_id, { type: "chat.message-updated", message: rowToMessage(updated) });

  return c.json({ messageId: id });
}
