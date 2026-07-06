// SQLite-backed ConversationRepository. The singleton in
// repositories/conversationRepository.ts is constructed by calling this factory
// with the shared DB instance from getDb().
//
// All timestamps are ISO 8601 strings supplied by the caller — SQLite's
// datetime('now') is intentionally avoided so the server controls time
// (deterministic tests, no timezone surprises). foreign_keys=ON is set
// per-connection in openDatabase(), so appendMessage on a missing
// conversation throws a FK violation instead of silently no-op'ing — failing
// fast surfaces caller bugs.
import type { Database } from "@db/sqlite";
import type { ConversationRepository } from "../conversationRepository.ts";
import type {
  Conversation,
  ConversationSummary,
  Message,
  MessageStats,
} from "../../../shared/types.ts";

// Snake-case row shapes mirroring the schema in db.ts (migration v1). Column
// names come back verbatim from @db/sqlite as object keys.
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
  // NULL when the conversation has no messages yet; coerced to "" below.
  preview: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string; // dropped during mapping
  role: "user" | "assistant";
  text: string;
  reasoning: string | null;
  starred: number; // stored as 0 / 1
  stats_json: string | null;
  created_at: string;
};

// maps a conversations row minus messages; messages are appended separately in
// getConversation so they can be fetched in chronological order.
function rowToConversation(
  row: ConversationRow,
): Omit<Conversation, "messages"> {
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSummary(row: SummaryRow): ConversationSummary {
  return {
    id: row.id,
    label: row.label,
    preview: row.preview ?? "",
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    role: row.role,
    text: row.text,
    // null → undefined keeps the Message shape; the two are interchangeable
    // for optional fields once serialized over the wire.
    reasoning: row.reasoning ?? undefined,
    starred: !!row.starred,
    stats: row.stats_json
      ? (JSON.parse(row.stats_json) as MessageStats)
      : undefined,
    createdAt: row.created_at,
  };
}

export function createSqliteConversationRepository(
  db: Database,
): ConversationRepository {
  return {
    // Sidebar list: newest first, with the last message text as a preview.
    // The correlated subquery rides on idx_messages_conversation
    // (conversation_id, created_at) so it's a single indexed lookup per row.
    async getConversations() {
      return db.prepare(`
        SELECT c.id, c.label, c.updated_at,
               (SELECT m.text FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC LIMIT 1) as preview
        FROM conversations c
        ORDER BY c.updated_at DESC
      `).all<SummaryRow>().map(rowToSummary);
    },

    // Full fetch: conversation row + its messages ordered oldest-first so the
    // UI renders a chronological thread. Returns null (not an error) when the
    // id doesn't exist so HTTP handlers can map to 404.
    async getConversation(id) {
      const conv = db.prepare(
        "SELECT id, label, created_at, updated_at FROM conversations WHERE id = ?",
      ).get<ConversationRow>(id);
      if (!conv) return null;
      const messages = db.prepare(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      ).all<MessageRow>(id).map(rowToMessage);
      return { ...rowToConversation(conv), messages };
    },

    // Creates an empty conversation with the default German label. The first
    // user message later renames it via appendMessage.
    async createConversation() {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        "INSERT INTO conversations (id, label, created_at, updated_at) VALUES (?, ?, ?, ?)",
      ).run(id, "Neue Unterhaltung", now, now);
      return {
        id,
        label: "Neue Unterhaltung",
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
    },

    // Appends a message and bumps updated_at. On the first user message we
    // also derive the conversation label from the message text (capped at 60
    // chars). All three writes go in one transaction so a failure rolls back
    // the label/updatedAt bumps too. With foreign_keys=ON a non-existent
    // conversation_id throws a FK error — failing fast surfaces caller bugs.
    async appendMessage(conversationId, msg) {
      db.transaction(() => {
        db.prepare(
          "INSERT INTO messages (id, conversation_id, role, text, reasoning, starred, stats_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ).run(
          msg.id,
          conversationId,
          msg.role,
          msg.text,
          msg.reasoning ?? null,
          msg.starred ? 1 : 0,
          msg.stats ? JSON.stringify(msg.stats) : null,
          msg.createdAt,
        );
        db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(
          msg.createdAt,
          conversationId,
        );
        if (msg.role === "user") {
          const row = db.prepare(
            "SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND role = 'user'",
          ).get<{ cnt: number }>(conversationId);
          if ((row?.cnt ?? 0) === 1) {
            const label = msg.text.slice(0, 60).trim() || "Neue Unterhaltung";
            db.prepare("UPDATE conversations SET label = ? WHERE id = ?").run(
              label,
              conversationId,
            );
          }
        }
      })();
    },
  };
}
