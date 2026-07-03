import type { Context } from "hono";

// Simple liveness probe used by monitoring / dev scripts.
export function getHealth(c: Context) {
  return c.json({ ok: true });
}
