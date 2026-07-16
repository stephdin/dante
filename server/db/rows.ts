// Shared SQLite row types and mappers. Used by handlers and the worker so the
// DB column → domain object mapping lives in one place.

import type {
  GenerationJob,
  Message,
  MessagePart,
} from "../../shared/types.ts";

export type ConversationRow = {
  id: string;
  label: string;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  parts: string;
  stats: string | null;
  status: "generating" | "complete" | "error" | "cancelled";
  created_at: string;
  preset_id: string | null;
};

export type JobRow = {
  id: string;
  conversation_id: string;
  message_id: string;
  preset_id: string;
  status: "pending" | "running" | "completed" | "failed" | "dead" | "cancelled";
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    parts: JSON.parse(row.parts) as MessagePart[],
    stats: row.stats ? JSON.parse(row.stats) : undefined,
    status: row.status,
    createdAt: row.created_at,
    presetId: row.preset_id ?? undefined,
  };
}

export function rowToJob(row: JobRow): GenerationJob {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
    presetId: row.preset_id,
    status: row.status,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    nextRetryAt: row.next_retry_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
