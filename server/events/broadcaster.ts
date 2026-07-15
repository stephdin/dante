/**
 * In-memory map of conversation id → connected sockets.
 *
 * The worker broadcasts events after every DB write. Clients subscribe via the
 * WebSocket upstream "subscribe" message. Disconnect → auto-unsubscribe.
 */

const subs = new Map<string, Set<WebSocket>>();

export function subscribe(conversationId: string, socket: WebSocket) {
  let set = subs.get(conversationId);
  if (!set) {
    set = new Set();
    subs.set(conversationId, set);
  }
  set.add(socket);
}

export function unsubscribe(conversationId: string, socket: WebSocket) {
  subs.get(conversationId)?.delete(socket);
}

/** Remove a socket from every conversation it was watching. */
export function unsubscribeAll(socket: WebSocket) {
  for (const [, sockets] of subs) {
    sockets.delete(socket);
  }
}

/** Send a JSON event to every socket watching a conversation. */
export function broadcast(
  conversationId: string,
  event: Record<string, unknown>,
) {
  const sockets = subs.get(conversationId);
  if (!sockets || sockets.size === 0) {
    console.log(
      `broadcast: no subscribers for ${conversationId} (event: ${event.type})`,
    );
    return;
  }
  console.log(
    `broadcast: sending ${event.type} to ${sockets.size} socket(s) for ${conversationId}`,
  );
  const msg = JSON.stringify(event);
  for (const ws of sockets) {
    try {
      ws.send(msg);
    } catch {
      // Socket died between subscribe and send; cleanup will catch it.
    }
  }
}

/** Send a JSON event to every connected socket. */
export function broadcastAll(event: Record<string, unknown>) {
  const seen = new Set<WebSocket>();
  const msg = JSON.stringify(event);
  for (const [, sockets] of subs) {
    for (const ws of sockets) {
      if (seen.has(ws)) continue;
      seen.add(ws);
      try {
        ws.send(msg);
      } catch {
        // Ignore.
      }
    }
  }
}
