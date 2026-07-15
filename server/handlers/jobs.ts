import type { Context } from "hono";
import { getDb } from "../db/db.ts";
import { broadcast } from "../events/broadcaster.ts";
import type { GenerationJob } from "../../shared/types.ts";

type JobRow = {
  id: string;
  conversation_id: string;
  message_id: string;
  preset_id: string;
  status: "pending" | "running" | "completed" | "failed" | "dead" | "cancelled";
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

function rowToJob(row: JobRow): GenerationJob {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
    presetId: row.preset_id,
    status: row.status,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    nextRetryAt: row.next_retry_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function notFound(c: Context, resource: string) {
  return c.json(
    { error: { code: "not_found", message: `${resource} not found` } },
    404,
  );
}

export function getJob(c: Context) {
  const row = getDb()
    .prepare("SELECT * FROM generation_jobs WHERE id = ?")
    .get<JobRow>(c.req.param("id"));

  if (!row) return notFound(c, "job");
  return c.json(rowToJob(row));
}

export function cancelJob(c: Context) {
  const db = getDb();
  const id = c.req.param("id");

  const job = db
    .prepare("SELECT * FROM generation_jobs WHERE id = ?")
    .get<JobRow>(id);
  if (!job) return notFound(c, "job");

  // Only cancel if the job is still active.
  if (
    job.status !== "pending" &&
    job.status !== "running" &&
    job.status !== "failed"
  ) {
    return c.json(
      { error: { code: "conflict", message: `job is already ${job.status}` } },
      409,
    );
  }

  const now = new Date().toISOString();

  db.prepare(
    "UPDATE generation_jobs SET status = 'cancelled', updated_at = ? WHERE id = ?",
  ).run(now, id);

  db.prepare("UPDATE messages SET status = 'cancelled' WHERE id = ?").run(
    job.message_id,
  );

  broadcast(job.conversation_id, {
    type: "chat.cancelled",
    conversationId: job.conversation_id,
    messageId: job.message_id,
  });

  return c.json(null);
}
