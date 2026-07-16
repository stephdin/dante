import { log } from "../lib/log.ts";

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
    log.info(`queue: push ${jobId} → handing to waiting worker`);
    waiters.shift()!.resolve(jobId);
  } else {
    queue.push(jobId);
    log.info(
      `queue: push ${jobId} → queued (depth ${queue.length}, no idle workers)`,
    );
  }
}

export function take(): Promise<string> {
  if (queue.length > 0) {
    const id = queue.shift()!;
    log.info(
      `queue: take ${id} → dequeued (depth ${queue.length - 1} remaining)`,
    );
    return Promise.resolve(id);
  }
  log.info("queue: take → no jobs, worker waiting");
  return new Promise((resolve) => {
    waiters.push({ resolve });
  });
}
