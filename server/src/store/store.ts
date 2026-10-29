import type { UIMessage } from "ai"

export type Conversation = {
  id: string
  title: string
  messages: UIMessage[]
  updatedAt: string
}

export type ConversationSummary = Omit<Conversation, "messages">

/** Persistence port. The run logic only talks to this interface. */
export interface ConversationStore {
  list(): ConversationSummary[]
  get(id: string): Conversation | undefined
  save(conversation: Omit<Conversation, "updatedAt">): void
  rename(id: string, title: string): boolean
  delete(id: string): boolean
}
