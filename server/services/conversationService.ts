import { conversationRepository } from "../repositories/conversationRepository.ts";
import type { Conversation, ConversationSummary } from "../../shared/types.ts";

// Returns a lightweight projection of all conversations for lists/sidebars.
export async function getConversations(): Promise<ConversationSummary[]> {
  return conversationRepository.getConversations();
}

// Returns the full conversation (with messages) or null if not found.
export async function getConversation(id: string): Promise<Conversation | null> {
  return conversationRepository.getConversation(id);
}

// Creates a new empty conversation.
export async function createConversation(): Promise<Conversation> {
  return conversationRepository.createConversation();
}
