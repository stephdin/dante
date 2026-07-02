import type { Context } from "hono";

// Simple structured logging + in-memory request statistics for the mockup
// server. No external deps; everything lives in process memory and resets on
// restart.

const startTime = Date.now();

export const stats = {
  requests: 0,
  byPath: {} as Record<string, number>,
  chatRequests: 0,
  chatErrors: 0,
  totalChunks: 0,
  totalOutputTokens: 0,
  lastError: null as string | null,
};

function ts(): string {
  // Stable, sortable ISO timestamp for log lines.
  return new Date().toISOString();
}

export function log(scope: string, message: string): void {
  console.log(`[${ts()}] [${scope}] ${message}`);
}

// Hono middleware: counts and logs every request with method, path, status,
// and duration. Placed early so it wraps all route handlers.
export function requestLogger() {
  return async (c: Context, next: () => Promise<void>) => {
    const start = performance.now();
    await next();
    const ms = Math.round(performance.now() - start);
    const path = c.req.path;
    stats.requests++;
    stats.byPath[path] = (stats.byPath[path] ?? 0) + 1;
    log("REQ", `${c.req.method} ${path} → ${c.res.status} (${ms}ms)`);
  };
}

// Snapshot of stats for the /api/stats endpoint. byPath is copied so the
// response is a plain object the caller can't mutate.
export function getStats() {
  return {
    uptimeMs: Date.now() - startTime,
    requests: stats.requests,
    byPath: { ...stats.byPath },
    chatRequests: stats.chatRequests,
    chatErrors: stats.chatErrors,
    totalChunks: stats.totalChunks,
    totalOutputTokens: stats.totalOutputTokens,
    lastError: stats.lastError,
  };
}
