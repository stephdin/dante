export type ServerEvent =
  | { type: "conversations-changed" }
  | { type: "run-started"; conversationId: string }
  | { type: "run-finished"; conversationId: string }

export type EventBus = ReturnType<typeof createEventBus>

/** In-process pub/sub that fans server events out to every open client. */
export function createEventBus() {
  const listeners = new Set<(event: ServerEvent) => void>()
  return {
    publish(event: ServerEvent) {
      for (const listener of listeners) listener(event)
    },
    subscribe(listener: (event: ServerEvent) => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
