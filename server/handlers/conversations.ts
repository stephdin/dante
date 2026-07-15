import type { Context } from "hono";
import { getDb } from "../db/db.ts";
import type {
  Conversation,
  ConversationSummary,
  Message,
  MessagePart,
} from "../../shared/types.ts";

// ── Row types ────────────────────────────────────────────────────────────────

type ConversationRow = {
  id: string;
  label: string;
  created_at: string;
  updated_at: string;
};

type SummaryRow = {
  id: string;
  label: string;
  updated_at: string;
  last_parts: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  parts: string;
  stats: string | null;
  status: "generating" | "complete" | "error" | "cancelled";
  created_at: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function notFound(c: Context, resource: string) {
  return c.json(
    { error: { code: "not_found", message: `${resource} not found` } },
    404,
  );
}

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

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    parts: JSON.parse(row.parts) as MessagePart[],
    stats: row.stats ? JSON.parse(row.stats) : undefined,
    status: row.status,
    createdAt: row.created_at,
  };
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

export function createConversation(c: Context) {
  return c.req.json().then((body: { label?: string }) => {
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
  });
}

export function updateConversation(c: Context) {
  return c.req.json().then((body: { label?: string }) => {
    const id = c.req.param("id");

    const existing = getDb()
      .prepare(
        "SELECT id, label, created_at, updated_at FROM conversations WHERE id = ?",
      )
      .get<ConversationRow>(id);
    if (!existing) return notFound(c, "conversation");

    const label = (body.label ?? "").trim();
    if (!label) {
      return c.json(
        { error: { code: "bad_request", message: "label is required" } },
        400,
      );
    }

    const timestamp = now();
    getDb()
      .prepare(
        "UPDATE conversations SET label = ?, updated_at = ? WHERE id = ?",
      )
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
  });
}

export function deleteConversation(c: Context) {
  const id = c.req.param("id");

  const existing = getDb()
    .prepare("SELECT 1 FROM conversations WHERE id = ?")
    .get(id);
  if (!existing) return notFound(c, "conversation");

  getDb().prepare("DELETE FROM conversations WHERE id = ?").run(id);
  return c.json(null);
}
