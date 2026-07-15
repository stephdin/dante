import type { Context } from "hono";
import { getDb } from "../db/db.ts";
import { cancelJobById } from "./jobs.ts";
import { notFound, badRequest } from "./_http.ts";
import type { ConversationRow, MessageRow } from "../db/rows.ts";
import { rowToMessage } from "../db/rows.ts";
import type { Conversation, ConversationSummary } from "../../shared/types.ts";

// ── Row types local to this handler ──────────────────────────────────────────

type SummaryRow = {
  id: string;
  label: string;
  updated_at: string;
  last_parts: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

/** Extract a text preview from a message's parts JSON. */
function previewFromParts(partsJson: string | null): string {
  if (!partsJson) return "";
  try {
    const parts = JSON.parse(partsJson) as { type: string; text: string }[];
    const text = parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");
    if (!text) return "";
    return text.length > 120 ? text.slice(0, 120) + "\u2026" : text;
  } catch {
    return "";
  }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export function listConversations(c: Context) {
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.label, c.updated_at,
              (SELECT m.parts FROM messages m
               WHERE m.conversation_id = c.id
               ORDER BY m.created_at DESC LIMIT 1) AS last_parts
       FROM conversations c
       ORDER BY c.updated_at DESC`,
    )
    .all<SummaryRow>();

  const list: ConversationSummary[] = rows.map((r) => ({
    id: r.id,
    label: r.label,
    preview: previewFromParts(r.last_parts),
    updatedAt: r.updated_at,
  }));

  return c.json(list);
}

export function getConversation(c: Context) {
  const id = c.req.param("id");

  const conv = getDb()
    .prepare(
      "SELECT id, label, created_at, updated_at FROM conversations WHERE id = ?",
    )
    .get<ConversationRow>(id);
  if (!conv) return notFound(c, "conversation");

  const msgs = getDb()
    .prepare(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    )
    .all<MessageRow>(id);

  const conversation: Conversation = {
    id: conv.id,
    label: conv.label,
    messages: msgs.map(rowToMessage),
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
  };

  return c.json(conversation);
}

export async function createConversation(c: Context) {
  const body = await c.req.json<{ label?: string }>();
  const id = crypto.randomUUID();
  const timestamp = now();
  const label = (body.label ?? "").trim() || "New conversation";

  getDb()
    .prepare(
      "INSERT INTO conversations (id, label, created_at, updated_at) VALUES (?, ?, ?, ?)",
    )
    .run(id, label, timestamp, timestamp);

  const conversation: Conversation = {
    id,
    label,
    messages: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return c.json(conversation, 201);
}

export async function updateConversation(c: Context) {
  const body = await c.req.json<{ label?: string }>();
  const id = c.req.param("id");

  const existing = getDb()
    .prepare(
      "SELECT id, label, created_at, updated_at FROM conversations WHERE id = ?",
    )
    .get<ConversationRow>(id);
  if (!existing) return notFound(c, "conversation");

  const label = (body.label ?? "").trim();
  if (!label) return badRequest(c, "label is required");

  const timestamp = now();
  getDb()
    .prepare("UPDATE conversations SET label = ?, updated_at = ? WHERE id = ?")
    .run(label, timestamp, id);

  const msgs = getDb()
    .prepare(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    )
    .all<MessageRow>(id);

  const conversation: Conversation = {
    id: existing.id,
    label,
    messages: msgs.map(rowToMessage),
    createdAt: existing.created_at,
    updatedAt: timestamp,
  };

  return c.json(conversation);
}

export function deleteConversation(c: Context) {
  const id = c.req.param("id");
  const db = getDb();

  const existing = db
    .prepare("SELECT 1 FROM conversations WHERE id = ?")
    .get(id);
  if (!existing) return notFound(c, "conversation");

  // Cancel any in-flight jobs before the cascade delete removes their rows.
  // Without this, the worker keeps streaming into deleted rows.
  const activeJobs = db
    .prepare(
      `SELECT id FROM generation_jobs
       WHERE conversation_id = ? AND status IN ('pending', 'running', 'failed')`,
    )
    .all<{ id: string }>(id);
  for (const job of activeJobs) {
    cancelJobById(job.id);
  }

  db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  return c.json(null);
}
