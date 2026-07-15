/**
 * WebSocket event client — singleton connection to /api/events.
 *
 * Components call subscribe(conversationId) to receive chat.token / chat.done /
 * chat.error events for a conversation. On disconnect, reconnects and
 * re-subscribes all active conversation ids. Listeners registered via on()
 * fire on every matching event.
 */

type EventHandler = (data: Record<string, unknown>) => void;

const DANTE_API_TOKEN = "1337";
const WS_BASE = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Map<string, Set<EventHandler>>();
const activeSubs = new Set<string>();

function emit(type: string, data: Record<string, unknown>) {
  const handlers = listeners.get(type);
  if (handlers) {
    for (const fn of handlers) fn(data);
  }
}

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  const url = `${WS_BASE}/api/events?token=${DANTE_API_TOKEN}`;
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("[events] ws connected, re-subscribing", [...activeSubs]);
    emit("reconnect", {});
    // Re-subscribe all active conversations on reconnect
    for (const id of activeSubs) {
      send({ type: "subscribe", conversationId: id });
    }
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data as string) as { type: string } & Record<
        string,
        unknown
      >;
      emit(msg.type, msg);
      console.log(`[events] received: ${msg.type}`, msg);
    } catch {
      // ignore malformed
    }
  };

  ws.onclose = () => {
    ws = null;
    // Reconnect after 2s
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connect();
      }, 2000);
    }
  };
}

function send(data: Record<string, unknown>) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/** Subscribe to events for a conversation. Idempotent — repeated calls are fine. */
export function subscribe(conversationId: string) {
  activeSubs.add(conversationId);
  connect();
  if (ws?.readyState === WebSocket.OPEN) {
    send({ type: "subscribe", conversationId });
  }
}

/** Unsubscribe from a conversation. */
export function unsubscribe(conversationId: string) {
  activeSubs.delete(conversationId);
  send({ type: "unsubscribe", conversationId });
}

/** Register a handler for an event type. Returns an unsubscribe function. */
export function on(type: string, handler: EventHandler): () => void {
  let set = listeners.get(type);
  if (!set) {
    set = new Set();
    listeners.set(type, set);
  }
  set.add(handler);
  return () => set?.delete(handler);
}

/** Tear down the connection. */
export function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  activeSubs.clear();
  listeners.clear();
  ws?.close();
  ws = null;
}
