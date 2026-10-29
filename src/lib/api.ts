import type { UIMessage } from "ai"

// These types mirror the server's responses and events (see server/src).

export type ConversationSummary = {
  id: string
  title: string
  updatedAt: string
  running: boolean
}

export type Conversation = ConversationSummary & { messages: UIMessage[] }

export type ServerEvent =
  | { type: "conversations-changed" }
  | { type: "run-started"; conversationId: string }
  | { type: "run-finished"; conversationId: string }

// Throws on errors, except for a 404, which callers handle as "not found".
async function request(path: string, init?: RequestInit) {
  const response = await fetch(`/api${path}`, init)
  if (!response.ok && response.status !== 404) {
    throw new Error(`${init?.method ?? "GET"} ${path}: ${response.status}`)
  }
  return response
}

const conversationPath = (id: string) =>
  `/conversations/${encodeURIComponent(id)}`

export async function listConversations(): Promise<ConversationSummary[]> {
  return (await request("/conversations")).json()
}

export async function getConversation(
  id: string
): Promise<Conversation | undefined> {
  const response = await request(conversationPath(id))
  return response.status === 404 ? undefined : response.json()
}

export async function renameConversation(id: string, title: string) {
  await request(conversationPath(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  })
}

export async function deleteConversation(id: string) {
  await request(conversationPath(id), { method: "DELETE" })
}

export async function stopRun(id: string) {
  await request(`/chat/${encodeURIComponent(id)}/stop`, { method: "POST" })
}
