import { generateId, type UIMessage, type UIMessageChunk } from "ai"
import type { Agent } from "../agent/agent.ts"
import type { EventBus } from "../events/bus.ts"
import type { Conversation, ConversationStore } from "../store/store.ts"

type Run = {
  abort: AbortController
  // Every chunk so far, so late subscribers get a full replay.
  chunks: UIMessageChunk[]
  subscribers: Set<ReadableStreamDefaultController<UIMessageChunk>>
  done: Promise<void>
}

export type Runs = ReturnType<typeof createRuns>

/**
 * Agent runs live here, not in the HTTP request: closing the browser only
 * drops a subscriber, the run keeps going and saves after every step.
 */
export function createRuns(deps: {
  store: ConversationStore
  events: EventBus
  agent: Agent
}) {
  const { store, events, agent } = deps
  const active = new Map<string, Run>()

  function broadcast(run: Run, chunk: UIMessageChunk) {
    run.chunks.push(chunk)
    for (const subscriber of run.subscribers) subscriber.enqueue(chunk)
  }

  async function execute(
    run: Run,
    conversation: Omit<Conversation, "updatedAt">
  ) {
    const save = ({ messages }: { messages: UIMessage[] }) =>
      store.save({ ...conversation, messages })

    try {
      const result = await agent(conversation.messages, run.abort.signal)
      const stream = result.toUIMessageStream({
        originalMessages: conversation.messages,
        generateMessageId: generateId,
        sendReasoning: true,
        onStepEnd: save,
        onEnd: save,
        onError: errorText,
      })
      for await (const chunk of stream) broadcast(run, chunk)
    } catch (error) {
      console.error(`run ${conversation.id} failed:`, error)
      broadcast(run, { type: "error", errorText: errorText(error) })
    } finally {
      for (const subscriber of run.subscribers) subscriber.close()
      active.delete(conversation.id)
      events.publish({ type: "run-finished", conversationId: conversation.id })
      events.publish({ type: "conversations-changed" })
    }
  }

  return {
    isRunning: (id: string) => active.has(id),

    /** Saves the conversation and starts a run in the background. */
    start(conversation: Omit<Conversation, "updatedAt">) {
      if (active.has(conversation.id))
        throw new Error("a run is already active")
      store.save(conversation)
      const run: Run = {
        abort: new AbortController(),
        chunks: [],
        subscribers: new Set(),
        done: Promise.resolve(),
      }
      active.set(conversation.id, run)
      run.done = execute(run, conversation)
      events.publish({ type: "run-started", conversationId: conversation.id })
      events.publish({ type: "conversations-changed" })
    },

    /** Replays the active run from the start, then follows it live. */
    subscribe(id: string): ReadableStream<UIMessageChunk> | undefined {
      const run = active.get(id)
      if (!run) return undefined
      let subscriber: ReadableStreamDefaultController<UIMessageChunk>
      return new ReadableStream({
        start(controller) {
          subscriber = controller
          for (const chunk of run.chunks) controller.enqueue(chunk)
          run.subscribers.add(controller)
        },
        cancel() {
          run.subscribers.delete(subscriber)
        },
      })
    },

    stop(id: string) {
      active.get(id)?.abort.abort()
    },

    async stopAll() {
      const runs = [...active.values()]
      for (const run of runs) run.abort.abort()
      await Promise.all(runs.map((run) => run.done))
    },
  }
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
