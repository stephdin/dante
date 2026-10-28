import type { Context } from "hono";
import { getDb } from "../db/db.ts";
import { broadcast } from "../events/broadcaster.ts";
import type { JobRow } from "../db/rows.ts";
import { rowToJob } from "../db/rows.ts";
import { notFound } from "./_http.ts";
import { log } from "../lib/log.ts";

type CancelResult =
  | { ok: true }
  | { ok: false; status: 404 | 409; code: string; message: string };

/**
 * Cancel a job by id. Business function — no HTTP context.
 * Updates the job + message status, broadcasts `chat.cancelled` and `job.status`.
 * Called from both the HTTP handler and the WS control message.
 */
export function cancelJobById(jobId: string): CancelResult {
  const db = getDb();
  const job = db
    .prepare("SELECT * FROM generation_jobs WHERE id = ?")
    .get<JobRow>(jobId);
  if (!job) {
    log.warn(`job: cancel ${jobId} failed — not found`);
    return {
      ok: false,
      status: 404,
      code: "not_found",
      message: "job not found",
    };
  }

  if (
    job.status !== "pending" &&
    job.status !== "running" &&
    job.status !== "failed"
  ) {
    log.warn(`job: cancel ${jobId} failed — already ${job.status}`);
    return {
      ok: false,
      status: 409,
      code: "conflict",
      message: `job is already ${job.status}`,
    };
  }

  const now = new Date().toISOString();

  db.prepare(
    "UPDATE generation_jobs SET status = 'cancelled', updated_at = ? WHERE id = ?",
  ).run(now, jobId);

  db.prepare("UPDATE messages SET status = 'cancelled' WHERE id = ?").run(
    job.message_id,
  );

  broadcast(job.conversation_id, {
    type: "chat.cancelled",
    conversationId: job.conversation_id,
    messageId: job.message_id,
  });
  broadcast(job.conversation_id, {
    type: "job.status",
    jobId,
    status: "cancelled",
  });

  log.info(`job: ${jobId} cancelled`);
  return { ok: true };
}

export function getJob(c: Context) {
  const row = getDb()
    .prepare("SELECT * FROM generation_jobs WHERE id = ?")
    .get<JobRow>(c.req.param("id"));
  if (!row) return notFound(c, "job");
  return c.json(rowToJob(row));
}

export function cancelJob(c: Context) {
  const result = cancelJobById(c.req.param("id"));
  if (!result.ok) {
    return c.json(
      { error: { code: result.code, message: result.message } },
      result.status,
    );
  }
  return c.json(null);
}
