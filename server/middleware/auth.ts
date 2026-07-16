import type { Context, Next } from "hono";
import { log } from "../lib/log.ts";

/**
 * Bearer token auth middleware.
 *
 * Reads DANTE_API_TOKEN from the environment. If the env var is not set, all
 * requests pass through (dev convenience). Otherwise, every request must carry
 * an `Authorization: Bearer <token>` header matching the configured value.
 */
export async function auth(c: Context, next: Next) {
  const expected = Deno.env.get("DANTE_API_TOKEN");
  if (!expected) {
    return await next();
  }
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== expected) {
    log.warn(`auth: unauthorized request to ${c.req.method} ${c.req.path}`);
    return c.json(
      {
        error: {
          code: "unauthorized",
          message: "invalid or missing bearer token",
        },
      },
      401,
    );
  }
  return await next();
}
