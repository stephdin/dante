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
  /** Renames only if the title is still `from`, so user renames win. */
  replaceTitle(id: string, from: string, to: string): boolean
  delete(id: string): boolean
}

/** Which built-in tools are switched on. Unknown ids use the tool's default. */
export interface ToolSettingsStore {
  toolStates(): Map<string, boolean>
  setToolEnabled(id: string, enabled: boolean): void
}
