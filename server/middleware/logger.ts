import type { Context, Next } from "hono";
import { log } from "../lib/log.ts";

/** Log every request: method, path, status, duration. */
export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  log.info(`${c.req.method} ${c.req.path} → ${c.res.status} (${ms}ms)`);
}
