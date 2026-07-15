/**
 * Exponential backoff retry scheduler.
 *
 * Delays: 30s → 1m → 2m → 5m → 10m (cap).
 * After the final failure, the caller should mark the job `dead`.
 */

const BACKOFF_MS = [30_000, 60_000, 120_000, 300_000, 600_000];

/** Schedule a retry push after the backoff delay for retryCount. */
export function scheduleRetry(
  jobId: string,
  retryCount: number,
  onDue: (id: string) => void,
) {
  const delay = BACKOFF_MS[Math.min(retryCount, BACKOFF_MS.length - 1)];
  setTimeout(() => onDue(jobId), delay);
}

/** Returns true if retryCount has exhausted all backoff steps. */
export function isExhausted(retryCount: number, maxRetries: number): boolean {
  return retryCount >= maxRetries;
}
