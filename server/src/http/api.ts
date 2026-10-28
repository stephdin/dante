import { Hono } from "hono"
import { bearerAuth } from "hono/bearer-auth"
import { HTTPException } from "hono/http-exception"
import { logger } from "hono/logger"
import { streamSSE } from "hono/streaming"
import {
  createUIMessageStreamResponse,
  validateUIMessages,
  type UIMessage,
} from "ai"
import type { EventBus } from "../events/bus.ts"
import type { Runs } from "../runs/runs.ts"
import type { ConversationStore } from "../store/store.ts"

type ChatRequest = {
  id: string
  trigger: "submit-message" | "regenerate-message"
  messageId?: string
  message?: unknown
}

export function createApi(deps: {
  store: ConversationStore
  runs: Runs
  events: EventBus
  token?: string
}) {
  const { store, runs, events, token } = deps
  const app = new Hono().basePath("/api")

  app.use(logger())

  app.onError((err, c) => {
    if (err instanceof HTTPException) return err.getResponse()
    console.error(err)
    return c.json({ error: "internal server error" }, 500)
  })

  app.get("/health", (c) => c.text("ok"))

  if (token) app.use("/*", bearerAuth({ token }))

  // ── Conversations ──────────────────────────────────────────────────────────

  app.get("/conversations", (c) =>
    c.json(
      store.list().map((conversation) => ({
        ...conversation,
        running: runs.isRunning(conversation.id),
      }))
    )
  )

  app.get("/conversations/:id", (c) => {
    const conversation = store.get(c.req.param("id"))
    if (!conversation) return c.json({ error: "not found" }, 404)
    return c.json({ ...conversation, running: runs.isRunning(conversation.id) })
  })

  app.delete("/conversations/:id", (c) => {
    const id = c.req.param("id")
    runs.stop(id)
    if (!store.delete(id)) return c.json({ error: "not found" }, 404)
    events.publish({ type: "conversations-changed" })
    return c.body(null, 204)
  })

  // ── Chat (AI SDK transport protocol) ──────────────────────────────────────

  app.post("/chat", async (c) => {
    const { id, trigger, messageId, message } = await c.req.json<ChatRequest>()
    if (runs.isRunning(id))
      return c.json({ error: "a run is already active" }, 409)

    const existing = store.get(id)
    let messages = existing?.messages ?? []

    if (trigger === "regenerate-message") {
      // Same truncation as the client: drop the answer that gets regenerated.
      const index = messageId
        ? messages.findIndex((m) => m.id === messageId)
        : messages.findLastIndex((m) => m.role === "assistant")
      if (index !== -1) {
        messages = messages.slice(
          0,
          messages[index].role === "assistant" ? index : index + 1
        )
      }
    } else {
      const [userMessage] = await validateUIMessages<UIMessage>({
        messages: [message],
      })
      messages = [...messages, userMessage]
    }

    runs.start({ id, title: existing?.title ?? titleFrom(messages), messages })
    return createUIMessageStreamResponse({ stream: runs.subscribe(id)! })
  })

  app.get("/chat/:id/stream", (c) => {
    const stream = runs.subscribe(c.req.param("id"))
    if (!stream) return c.body(null, 204)
    return createUIMessageStreamResponse({ stream })
  })

  app.post("/chat/:id/stop", (c) => {
    runs.stop(c.req.param("id"))
    return c.body(null, 204)
  })

  // ── Server events ─────────────────────────────────────────────────────────

  app.get("/events", (c) =>
    streamSSE(c, async (stream) => {
      const unsubscribe = events.subscribe((event) => {
        void stream.writeSSE({ data: JSON.stringify(event) })
      })
      stream.onAbort(unsubscribe)
      // Keep idle connections from being closed by proxies.
      while (!stream.aborted) {
        await stream.sleep(25_000)
        await stream.write(": ping\n\n")
      }
    })
  )

  return app
}

function titleFrom(messages: UIMessage[]) {
  const text = messages
    .find((m) => m.role === "user")
    ?.parts.flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join(" ")
    .trim()
  if (!text) return "Neue Unterhaltung"
  return text.length > 60 ? `${text.slice(0, 60)}…` : text
}
