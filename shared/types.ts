// Shared domain types. Config entity types are derived from Zod schemas in
// `shared/schemas/config.ts` to keep validation and types in sync.

import type {
  Assistant,
  Config,
  Mcp,
  Model,
  Preset,
  Provider,
  SdkType,
} from "./schemas/config.ts";

// Re-export config types — pure type re-export, fully erased at compile time.
export type { SdkType, Model, Provider, Assistant, Mcp, Preset, Config };

// Runtime-enriched MCP type used on the settings screen. The `status` field is
// reported by the server at runtime and is never stored in the config file.
export type McpConnection = Mcp & {
  status: "connected" | "disconnected" | "error";
};

// ── Message parts (future-proof: text, reasoning, tool-call, tool-result) ───

export type MessagePart =
  { type: "text"; text: string } | { type: "reasoning"; text: string };
// future:
// | { type: "tool-call"; toolName: string; args: unknown }
// | { type: "tool-result"; toolName: string; result: unknown };

// ── Message stats (provider-side token / performance metadata) ───────────────

export type MessageStats = {
  provider?: string;
  modelId?: string;
  responseId?: string;
  finishReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
    textTokens?: number;
  };
  performance?: {
    responseTimeMs?: number;
    timeToFirstOutputMs?: number;
    reasoningTimeMs?: number;
    outputTokensPerSecond?: number;
  };
};

// ── Message ──────────────────────────────────────────────────────────────────

export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  stats?: MessageStats;
  status: "generating" | "complete" | "error" | "cancelled";
  createdAt: string; // ISO 8601
  // Preset used for this message. Set on both user and assistant rows at chat
  // time; absent on legacy rows created before the v2 migration. Drives the
  // "remember last preset" behaviour in the input and the per-message label in
  // statistics.
  presetId?: string;
  // User-facing star marker. Persisted so starred replies survive reloads.
  starred?: boolean;
};

// ── Conversation ─────────────────────────────────────────────────────────────

export type Conversation = {
  id: string;
  label: string;
  messages: Message[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

// Lightweight projection used by the conversation list / navbar.
export type ConversationSummary = {
  id: string;
  label: string;
  preview: string;
  updatedAt: string; // ISO 8601
};

// ── Generation job ───────────────────────────────────────────────────────────

export type GenerationJob = {
  id: string;
  conversationId: string;
  messageId: string;
  presetId: string;
  status: "pending" | "running" | "completed" | "failed" | "dead" | "cancelled";
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};
