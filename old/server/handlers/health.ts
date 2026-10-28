import type { Context } from "hono";

export function health(c: Context) {
  return c.text("ok");
}
