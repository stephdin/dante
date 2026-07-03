import type { Context } from "hono";

// Structured console log with ISO timestamp and scope. All server logs go
// through here so the format stays consistent.
export function log(scope: string, message: string): void {
  console.log(`[${new Date().toISOString()}] [${scope}] ${message}`);
}

// Hono middleware: logs every request with method, path, status, and duration.
export function requestLogger() {
  return async (c: Context, next: () => Promise<void>) => {
    const start = performance.now();
    await next();
    const ms = Math.round(performance.now() - start);
    log("REQ", `${c.req.method} ${c.req.path} → ${c.res.status} (${ms}ms)`);
  };
}
