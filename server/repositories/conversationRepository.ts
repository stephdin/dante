import type {
  Conversation,
  ConversationSummary,
  Message,
} from "../../shared/types.ts";
import { createSqliteConversationRepository } from "./sqlite/conversationSqlite.ts";
import { getDb } from "./sqlite/db.ts";

export interface ConversationRepository {
  getConversations(): Promise<ConversationSummary[]>;
  getConversation(id: string): Promise<Conversation | null>;
  createConversation(): Promise<Conversation>;
  appendMessage(conversationId: string, message: Message): Promise<void>;
}

// SQLite-backed singleton. The DB is opened (and migrations run) the first time
// this module is imported, via getDb().
export const conversationRepository: ConversationRepository =
  createSqliteConversationRepository(getDb());