/**
 * In-memory job queue. Event-driven — no polling, no timers.
 *
 * `push(id)` adds a job id. `take()` returns a Promise that resolves when
 * a job is available. If jobs are already queued, take() resolves immediately.
 */

type Waiter = { resolve: (id: string) => void };

const queue: string[] = [];
const waiters: Waiter[] = [];

export function push(jobId: string) {
  if (waiters.length > 0) {
    waiters.shift()!.resolve(jobId);
  } else {
    queue.push(jobId);
  }
}

export function take(): Promise<string> {
  if (queue.length > 0) {
    return Promise.resolve(queue.shift()!);
  }
  return new Promise((resolve) => {
    waiters.push({ resolve });
  });
}
