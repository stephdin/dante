import { getDb } from "../db/db.ts";
import { push, take } from "./queue.ts";
import { isExhausted, scheduleRetry } from "./retry.ts";
import { broadcast } from "../events/broadcaster.ts";
import { streamChat } from "../model/client.ts";
import type { Config, Message, MessagePart } from "../../shared/types.ts";

// ── Row types ────────────────────────────────────────────────────────────────

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
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  parts: string;
  stats: string | null;
  status: "generating" | "complete" | "error" | "cancelled";
  created_at: string;
};

// ── Startup ──────────────────────────────────────────────────────────────────

function scanAndEnqueue() {
  const db = getDb();
  const now = new Date().toISOString();

  const rows = db
    .prepare(
      `SELECT id FROM generation_jobs
       WHERE status IN ('pending', 'running')
          OR (status = 'failed' AND next_retry_at IS NOT NULL AND next_retry_at <= ?)`,
    )
    .all<{ id: string }>(now);

  for (const row of rows) {
    push(row.id);
  }

  if (rows.length > 0) {
    console.log(`worker: enqueued ${rows.length} orphaned job(s)`);
  }
}

// ── Main loop ────────────────────────────────────────────────────────────────

export function start() {
  scanAndEnqueue();
  loop();
}

async function loop() {
  while (true) {
    const jobId = await take();
    await processJob(jobId);
  }
}

// ── Job processing ───────────────────────────────────────────────────────────

const DB_FLUSH_MS = 1000;

async function processJob(jobId: string) {
  const db = getDb();
  const ts = () => new Date().toISOString();

  const job = db
    .prepare("SELECT * FROM generation_jobs WHERE id = ?")
    .get<JobRow>(jobId);
  if (!job) return;
  if (job.status === "cancelled" || job.status === "dead") return;

  // Mark running
  db.prepare(
    "UPDATE generation_jobs SET status = 'running', updated_at = ? WHERE id = ?",
  ).run(ts(), jobId);

  try {
    // Resolve preset & provider from config
    const configRow = db
      .prepare("SELECT json FROM config WHERE id = 1")
      .get<{ json: string }>();
    const config = JSON.parse(configRow!.json) as Config;
    const preset = config.presets.find((p) => p.id === job.preset_id);
    if (!preset) throw new Error(`preset "${job.preset_id}" not found`);

    // Find the provider that owns this model
    let provider: Config["providers"][number] | undefined;
    for (const p of config.providers) {
      if (p.models.some((m) => m.id === preset.modelId)) {
        provider = p;
        break;
      }
    }
    if (!provider) {
      throw new Error(`model "${preset.modelId}" not found in any provider`);
    }

    // Resolve API key
    const apiKey =
      Deno.env.get(`MODEL_PROVIDER_API_KEY_${provider.id.toUpperCase()}`) ??
      Deno.env.get("MODEL_PROVIDER_API_KEY");
    if (!apiKey) {
      throw new Error(
        `no API key for provider "${provider.id}" (set MODEL_PROVIDER_API_KEY_${provider.id.toUpperCase()} or MODEL_PROVIDER_API_KEY)`,
      );
    }

    // Resolve assistant system prompt
    const assistant = config.assistants.find(
      (a) => a.id === preset.assistantId,
    );
    const systemPrompt = assistant?.prompt;

    // Load conversation messages (exclude the in-progress generating one)
    const msgRows = db
      .prepare(
        "SELECT * FROM messages WHERE conversation_id = ? AND id != ? AND status != 'generating' ORDER BY created_at ASC",
      )
      .all<MessageRow>(job.conversation_id, job.message_id);
    const messages: Message[] = msgRows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      role: r.role,
      parts: JSON.parse(r.parts) as MessagePart[],
      status: r.status,
      createdAt: r.created_at,
    }));

    // Stream from model
    const { stream, finishReason, usage } = streamChat({
      baseUrl: provider.url,
      apiKey,
      modelId: preset.modelId,
      messages,
      systemPrompt,
      providerType: provider.type as "openai-compatible" | "anthropic",
    });

    const parts: MessagePart[] = [];
    let lastFlush = Date.now();

    for await (const part of stream) {
      // Cancel check
      const current = db
        .prepare("SELECT status FROM generation_jobs WHERE id = ?")
        .get<{ status: string }>(job.id);
      if (current?.status === "cancelled") return;

      parts.push(part);

      console.log(`worker: job ${job.id} token (${parts.length} parts)`);

      // Broadcast immediately (client sees real-time)
      broadcast(job.conversation_id, {
        type: "chat.token",
        conversationId: job.conversation_id,
        messageId: job.message_id,
        parts,
      });

      // Throttled DB write
      if (Date.now() - lastFlush >= DB_FLUSH_MS) {
        db.prepare("UPDATE messages SET parts = ? WHERE id = ?").run(
          JSON.stringify(parts),
          job.message_id,
        );
        lastFlush = Date.now();
      }
    }

    // Final flush
    db.prepare("UPDATE messages SET parts = ? WHERE id = ?").run(
      JSON.stringify(parts),
      job.message_id,
    );

    // Collect stats
    const [reason, tokUsage] = await Promise.all([finishReason, usage]);
    const stats = {
      provider: provider.name,
      modelId: preset.modelId,
      finishReason: reason,
      usage: tokUsage,
    };

    // Mark complete
    db.prepare(
      "UPDATE messages SET status = 'complete', stats = ? WHERE id = ?",
    ).run(JSON.stringify(stats), job.message_id);
    db.prepare(
      "UPDATE generation_jobs SET status = 'completed', updated_at = ? WHERE id = ?",
    ).run(ts(), job.id);

    broadcast(job.conversation_id, {
      type: "chat.done",
      conversationId: job.conversation_id,
      messageId: job.message_id,
    });

    console.log(
      `worker: job ${job.id} completed (${parts.length} parts, ${tokUsage.totalTokens ?? "?"} tokens)`,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`worker: job ${jobId} failed: ${errorMessage}`);

    const retryCount = job.retry_count + 1;
    const exhausted = isExhausted(retryCount, job.max_retries);

    if (exhausted) {
      getDb()
        .prepare(
          `UPDATE generation_jobs
         SET status = 'dead', retry_count = ?, error_message = ?, updated_at = ?
         WHERE id = ?`,
        )
        .run(retryCount, errorMessage, ts(), jobId);
      getDb()
        .prepare("UPDATE messages SET status = 'error' WHERE id = ?")
        .run(job.message_id);
      broadcast(job.conversation_id, {
        type: "chat.error",
        conversationId: job.conversation_id,
        messageId: job.message_id,
        error: errorMessage,
      });
    } else {
      const nextRetryAt = new Date(
        Date.now() + Math.min(retryCount, 5) * 30_000,
      ).toISOString();
      getDb()
        .prepare(
          `UPDATE generation_jobs
         SET status = 'failed', retry_count = ?, next_retry_at = ?, error_message = ?, updated_at = ?
         WHERE id = ?`,
        )
        .run(retryCount, nextRetryAt, errorMessage, ts(), jobId);
      scheduleRetry(jobId, retryCount, push);
    }
  }
}
