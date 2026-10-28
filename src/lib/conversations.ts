import { useSyncExternalStore } from "react"

import {
  listConversations,
  type ConversationSummary,
  type ServerEvent,
} from "@/lib/api"
import { syncAllChats, syncChatById } from "@/lib/chat"

let conversations: ConversationSummary[] = []
const listeners = new Set<() => void>()

async function refreshConversations() {
  conversations = await listConversations()
  for (const listener of listeners) listener()
}

export function useConversations() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => conversations
  )
}

/**
 * Keeps every open device in sync: the server announces runs and list
 * changes, and we refetch whatever is affected.
 */
export function connectServerEvents() {
  const source = new EventSource("/api/events")

  // Also fires after a reconnect, where we may have missed events.
  source.addEventListener("open", () => {
    void refreshConversations()
    syncAllChats()
  })

  source.addEventListener("message", (message: MessageEvent<string>) => {
    const event = JSON.parse(message.data) as ServerEvent
    if (event.type === "conversations-changed") void refreshConversations()
    else syncChatById(event.conversationId)
  })
}
