import type { ConversationRepository } from "../repositories/conversationRepository.ts";
import type { Conversation, ConversationSummary } from "../../shared/types.ts";

// Factory: builds a ConversationService bound to the supplied repository. The
// repository is injected by `main.ts` (or a test), so this module no longer
// reaches for a module-eval-time singleton.
//
// NOTE: This service is currently a 1:1 forwarder to the repository (see
// issues.md §1.1). The factory shape is preserved so the handler wiring is
// stable; collapsing it into the handlers is a follow-up.
export function createConversationService(repo: ConversationRepository) {
  return {
    // Returns a lightweight projection of all conversations for lists/sidebars.
    async getConversations(): Promise<ConversationSummary[]> {
      return repo.getConversations();
    },

    // Returns the full conversation (with messages) or null if not found.
    async getConversation(id: string): Promise<Conversation | null> {
      return repo.getConversation(id);
    },

    // Creates a new empty conversation.
    async createConversation(): Promise<Conversation> {
      return repo.createConversation();
    },
  };
}

export type ConversationService = ReturnType<typeof createConversationService>;