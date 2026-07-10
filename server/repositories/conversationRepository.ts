import type {
  Conversation,
  ConversationSummary,
  Message,
} from "../../shared/types.ts";

// Repository contract for conversation entities. The concrete SQLite
// implementation lives in `./sqlite/conversationSqlite.ts`; `main.ts`
// constructs it explicitly and injects it, so tests can swap in a fake against
// this interface without going through the module-eval-time singleton that
// used to live here.
export interface ConversationRepository {
  getConversations(): Promise<ConversationSummary[]>;
  getConversation(id: string): Promise<Conversation | null>;
  // Cheap existence check used by the chat path before streaming, so we don't
  // have to load the conversation's entire message history just to detect a
  // 404. Returns true iff a row with this id exists.
  existsConversation(id: string): Promise<boolean>;
  createConversation(): Promise<Conversation>;
  appendMessage(conversationId: string, message: Message): Promise<void>;
}