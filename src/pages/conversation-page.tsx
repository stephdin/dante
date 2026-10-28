import { useLoaderData } from "react-router"
import type { Chat } from "@ai-sdk/react"
import type { UIMessage } from "ai"

import { ChatView } from "@/components/chat-view"

export function ConversationPage() {
  // Client loaders aren't serialized, so this is the live Chat from loadChat.
  const chat = useLoaderData() as Chat<UIMessage>

  return <ChatView key={chat.id} chat={chat} />
}
