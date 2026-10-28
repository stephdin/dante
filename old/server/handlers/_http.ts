// Small HTTP response helpers shared across handlers.

import type { Context } from "hono";

export function notFound(c: Context, resource: string) {
  return c.json(
    { error: { code: "not_found", message: `${resource} not found` } },
    404,
  );
}

export function badRequest(c: Context, message: string) {
  return c.json(
    { error: { code: "bad_request", message } },
    400,
  );
}
