// Shared domain types used by both the Deno backend (server/) and the React
// frontend (src/). Keeping them in one place avoids drift between the API
// responses and the components that consume them.

export type Model = {
  id: string;
  name: string;
};

export type Provider = {
  id: string;
  name: string;
  type: string;
  url: string;
  models: Model[];
};

export type Assistant = {
  id: string;
  name: string;
  prompt: string;
};

export type McpConnection = {
  id: string;
  name: string;
  transport: string;
  status: "connected" | "disconnected";
};

export type Preset = {
  id: string;
  name: string;
  // Icon components live on the frontend only; the backend sends a stable id
  // that the UI maps to a Tabler icon (see src/config/presetIcons.ts).
  iconId: string;
  modelId: string;
  assistantId: string;
  mcpIds: string[];
  default: boolean;
};

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
    outputTokensPerSecond?: number;
    effectiveOutputTokensPerSecond?: number;
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

export type Config = {
  providers: Provider[];
  assistants: Assistant[];
  mcps: McpConnection[];
  presets: Preset[];
};
