import { Chat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"

import { getConversation } from "@/lib/api"

// The server owns the history, so only the new message goes over the wire.
const transport = new DefaultChatTransport<UIMessage>({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ id, messages, trigger, messageId }) => ({
    body: { id, trigger, messageId, message: messages.at(-1) },
  }),
})

// One Chat per conversation, kept for the lifetime of the page, so that
// navigating away and back (or from /new to /conversation/:id) keeps the
// messages and any running stream.
const chats = new Map<string, Chat<UIMessage>>()

export function getChat(id: string) {
  let chat = chats.get(id)
  if (!chat) {
    chat = new Chat({ id, transport })
    chats.set(id, chat)
  }
  return chat
}

/** Route loader: returns the Chat, fetching its history on first visit. */
export async function loadChat(id: string) {
  const isNew = !chats.has(id)
  const chat = getChat(id)
  if (isNew) await syncChat(chat)
  return chat
}

export function syncChatById(id: string) {
  const chat = chats.get(id)
  if (chat) void syncChat(chat)
}

export function syncAllChats() {
  for (const chat of chats.values()) void syncChat(chat)
}

/**
 * Pulls the saved state from the server and attaches to a run that was
 * started elsewhere, e.g. on another device. The resumed stream replays the
 * whole answer and replaces the partial one we just loaded.
 */
async function syncChat(chat: Chat<UIMessage>) {
  if (chat.status === "submitted" || chat.status === "streaming") return
  const conversation = await getConversation(chat.id)
  if (!conversation) return
  chat.messages = conversation.messages
  if (conversation.running) void chat.resumeStream()
}

export function getMessageText(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("")
}
