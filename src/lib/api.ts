import type { UIMessage } from "ai"

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

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`/api${path}`, init)
  if (!response.ok && response.status !== 404) {
    throw new Error(`${init?.method ?? "GET"} ${path}: ${response.status}`)
  }
  return response
}

export async function listConversations(): Promise<ConversationSummary[]> {
  return (await request("/conversations")).json()
}

export async function getConversation(
  id: string
): Promise<Conversation | undefined> {
  const response = await request(`/conversations/${encodeURIComponent(id)}`)
  return response.status === 404 ? undefined : response.json()
}

export async function renameConversation(id: string, title: string) {
  await request(`/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  })
}

export async function deleteConversation(id: string) {
  await request(`/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

export async function stopRun(id: string) {
  await request(`/chat/${encodeURIComponent(id)}/stop`, { method: "POST" })
}
