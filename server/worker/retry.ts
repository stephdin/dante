/**
 * Exponential backoff retry scheduler.
 *
 * Delays: 30s → 1m → 2m → 5m → 10m (cap).
 * After the final failure, the caller should mark the job `dead`.
 */

const BACKOFF_MS = [30_000, 60_000, 120_000, 300_000, 600_000];

/** Max retries — one per backoff step. */
export const MAX_RETRIES = BACKOFF_MS.length;

/** Get the backoff delay for a given 1-indexed retry count. */
export function backoffDelay(retryCount: number): number {
  const index = Math.min(retryCount - 1, BACKOFF_MS.length - 1);
  return BACKOFF_MS[index] ?? BACKOFF_MS[0];
}

/** Schedule a retry push after the backoff delay for retryCount. */
export function scheduleRetry(
  jobId: string,
  retryCount: number,
  onDue: (id: string) => void,
) {
  setTimeout(() => onDue(jobId), backoffDelay(retryCount));
}

/** Returns true if retryCount has exhausted all backoff steps. */
export function isExhausted(retryCount: number, maxRetries: number): boolean {
  return retryCount >= maxRetries;
}
