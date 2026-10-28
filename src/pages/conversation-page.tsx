import { useParams } from "react-router"

import { ChatView } from "@/components/chat-view"
import { getChat } from "@/lib/chat"

export function ConversationPage() {
  const { id } = useParams<{ id: string }>()

  return <ChatView key={id} chat={getChat(id!)} />
}
