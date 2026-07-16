import type { Context } from "hono";
import { subscribe, unsubscribe, unsubscribeAll } from "./broadcaster.ts";
import { cancelJobById } from "../handlers/jobs.ts";
import { log } from "../lib/log.ts";

/**
 * GET /api/events?token=<...>
 *
 * Upgrades to WebSocket. Authenticates via query token against DANTE_API_TOKEN
 * (same as HTTP auth). Accepts upstream control messages:
 *   subscribe, unsubscribe, cancel.
 */
export function events(c: Context) {
  // Auth
  const expected = Deno.env.get("DANTE_API_TOKEN");
  if (expected) {
    const token = c.req.query("token") ?? "";
    if (token !== expected) {
      return c.json(
        { error: { code: "unauthorized", message: "invalid token" } },
        401,
      );
    }
  }

  const { socket, response } = Deno.upgradeWebSocket(c.req.raw);

  socket.onopen = () => {
    log.info("ws: client connected");
  };

  socket.onmessage = (ev) => {
    let msg: { type?: string; conversationId?: string; jobId?: string };
    try {
      msg = JSON.parse(ev.data as string);
    } catch {
      log.warn("ws: malformed message received");
      return; // ignore malformed messages
    }

    switch (msg.type) {
      case "subscribe": {
        if (msg.conversationId) {
          log.info(`ws: client subscribed to ${msg.conversationId}`);
          subscribe(msg.conversationId, socket);
        }
        break;
      }
      case "unsubscribe": {
        if (msg.conversationId) {
          log.info(`ws: client unsubscribed from ${msg.conversationId}`);
          unsubscribe(msg.conversationId, socket);
        }
        break;
      }
      case "cancel": {
        if (msg.jobId) {
          log.info(`ws: client requested cancel for job ${msg.jobId}`);
          cancelJobById(msg.jobId);
        }
        break;
      }
      default: {
        log.warn(`ws: unknown message type "${msg.type ?? "<none>"}"`);
      }
    }
  };

  socket.onclose = () => {
    log.info("ws: client disconnected");
    unsubscribeAll(socket);
  };

  return response;
}
