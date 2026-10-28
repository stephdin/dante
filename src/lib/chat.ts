import { Chat } from "@ai-sdk/react"
import {
  simulateReadableStream,
  type ChatTransport,
  type UIMessage,
  type UIMessageChunk,
} from "ai"

import { initialMessages } from "@/lib/mock-data"

export function getMessageText(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("")
}

const words = (text: string) => text.split(/(?<= )/)

// Streams a canned reply word by word, so the UI behaves like a real chat
// without a server. Swap this for a real transport once the backend is back.
const mockTransport: ChatTransport<UIMessage> = {
  async sendMessages({ messages }) {
    const question = messages.at(-1) ? getMessageText(messages.at(-1)!) : ""
    const reply = [
      `Das ist eine **Demo-Antwort** auf „${question}“.`,
      "",
      "Sobald der Server angebunden ist, antwortet hier ein echtes Modell. Bis dahin:",
      "",
      "- Antworten werden *gestreamt*",
      "- Markdown wird mit `streamdown` gerendert",
      "",
      "```ts",
      'const answer = "kommt vom Server"',
      "```",
    ].join("\n")
    const reasoning =
      "Die Person möchte eine Antwort. Ich habe noch keinen Server, also zeige ich eine Demo mit etwas Markdown und einem Codeblock."
    const id = "text"
    const chunks: UIMessageChunk[] = [
      { type: "start" },
      { type: "reasoning-start", id: "reasoning" },
      ...words(reasoning).map(
        (delta): UIMessageChunk => ({
          type: "reasoning-delta",
          id: "reasoning",
          delta,
        })
      ),
      { type: "reasoning-end", id: "reasoning" },
      { type: "text-start", id },
      ...words(reply).map(
        (delta): UIMessageChunk => ({ type: "text-delta", id, delta })
      ),
      { type: "text-end", id },
      { type: "finish" },
    ]
    return simulateReadableStream({
      chunks,
      initialDelayInMs: 400,
      chunkDelayInMs: 40,
    })
  },
  async reconnectToStream() {
    return null
  },
}

// One Chat instance per conversation, kept for the lifetime of the page so
// that navigating away and back (or from /new to /conversation/:id) keeps
// the messages and any running stream.
const chats = new Map<string, Chat<UIMessage>>()

export function getChat(id: string) {
  let chat = chats.get(id)
  if (!chat) {
    chat = new Chat({
      id,
      transport: mockTransport,
      messages: initialMessages[id] ?? [],
    })
    chats.set(id, chat)
  }
  return chat
}
