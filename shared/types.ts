// Shared domain types. Config entity types are derived from Zod schemas in
// `shared/schemas/config.ts` to keep validation and types in sync. Message and
// conversation types are handwritten here — they flow through the chat path
// (AI SDK) and aren't user-facing config forms, so a Zod schema adds no value.

// Re-export config types — pure type re-export, fully erased at compile time.
export type {
  Model,
  Provider,
  Assistant,
  McpConnection,
  Preset,
  Config,
} from "./schemas/config.ts";

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

export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  reasoning?: string; // model thinking, assistant-only
  stats?: MessageStats; // provider-side token/performance metadata
  starred?: boolean;
  createdAt: string; // ISO 8601
};

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
