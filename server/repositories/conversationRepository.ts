import type {
  Conversation,
  ConversationSummary,
  Message,
} from "../../shared/types.ts";
import { conversations } from "./mock/mockData.ts";

export interface ConversationRepository {
  getConversations(): Promise<ConversationSummary[]>;
  getConversation(id: string): Promise<Conversation | null>;
  createConversation(): Promise<Conversation>;
  appendMessage(conversationId: string, message: Message): Promise<void>;
}

// Current conversation repository implementation backed by mock data. All state
// lives in the imported `conversations` array and resets on server restart.
export const conversationRepository: ConversationRepository = {
  // Lightweight list for sidebars: no full messages, just metadata + preview.
  async getConversations(): Promise<ConversationSummary[]> {
    return conversations.map((conv) => ({
      id: conv.id,
      label: conv.label,
      preview: conv.messages.at(-1)?.text ?? "",
      updatedAt: conv.updatedAt,
    }));
  },

  // Full conversation lookup. Returns null instead of throwing so callers can
  // decide on the HTTP status code.
  async getConversation(id: string): Promise<Conversation | null> {
    return conversations.find((c) => c.id === id) ?? null;
  },

  // Creates a new empty conversation and prepends it so it appears first.
  async createConversation(): Promise<Conversation> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const conv: Conversation = {
      id,
      label: "Neue Unterhaltung",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    conversations.unshift(conv);
    return conv;
  },

  // Appends a message and bumps the conversation's updatedAt. For the first
  // user message, derive the conversation label from the message text.
  async appendMessage(
    conversationId: string,
    msg: Message,
  ): Promise<void> {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;

    conv.messages.push(msg);
    conv.updatedAt = msg.createdAt;

    const userCount = conv.messages.filter((m) => m.role === "user").length;
    if (msg.role === "user" && userCount === 1) {
      conv.label = msg.text.slice(0, 60).trim() || "Neue Unterhaltung";
    }
  },
};
