import type { Context, Next } from "hono";

/** Log every request: method, path, status, duration. */
export async function logger(c: Context, next: Next) {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(
    `${c.req.method} ${c.req.path} → ${c.res.status} (${ms}ms)`,
  );
}
