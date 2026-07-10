import { convertToModelMessages, streamText, type UIMessage } from "ai";

import type { MessageStats } from "../../shared/types.ts";
import { createModelProvider } from "../lib/modelProvider.ts";
import { AppError } from "../lib/errors.ts";
import { log } from "../lib/log.ts";
import type { ConversationRepository } from "../repositories/conversationRepository.ts";
import type { ConfigService } from "./configService.ts";

export type ChatRequestBody = {
  messages: UIMessage[];
  conversationId: string;
  presetId?: string;
};

// Factory: builds a chatService bound to the supplied config service,
// conversation repository, and model provider API key. `main.ts` constructs
// one instance and injects it into the chat route handler; tests pass fakes.
//
// The API key is read once at boot by `main.ts` and passed in here, so this
// module no longer touches `Deno.env` at module-eval time.
export function createChatService(opts: {
  configService: ConfigService;
  conversationRepo: ConversationRepository;
  modelProviderApiKey: string | undefined;
}) {
  const { configService, conversationRepo, modelProviderApiKey } = opts;

  // Orchestrates a chat request: resolves provider/model/instructions,
  // persists the latest user message, streams the assistant reply, and
  // persists the assistant message when the stream ends. Throws AppError for
  // 4xx/5xx cases that should be surfaced as HTTP responses.
  async function streamChat({ messages, conversationId, presetId }: ChatRequestBody) {
    const { provider, modelId, instructions } = await configService.resolveChatConfig(
      presetId,
    );

    const lastUser = findLastUserMessage(messages);
    const preview = lastUser ? truncate(uiMessageText(lastUser), 50) : "";
    log(
      "CHAT",
      `request conversation=${conversationId} preset=${presetId ?? "-"} provider=${provider.id} model=${modelId} messages=${messages.length} userMsg="${preview}"`,
    );

    // Existence check only — we don't need the conversation's message history
    // here (the client streams the full UIMessage[] in the request body), so a
    // primary-key lookup is enough and avoids loading every row.
    const exists = await conversationRepo.existsConversation(conversationId);
    if (!exists) {
      log("CHAT", `rejected: conversation ${conversationId} not found`);
      throw new AppError("conversation not found", 404);
    }

    if (!modelProviderApiKey) {
      throw new AppError("MODEL_PROVIDER_API_KEY not set", 500);
    }

    // Persist the new user message before streaming so it survives a refresh
    // even if the stream fails or the client disconnects.
    if (lastUser) {
      await conversationRepo.appendMessage(conversationId, {
        id: crypto.randomUUID(),
        role: "user",
        text: uiMessageText(lastUser),
        createdAt: new Date().toISOString(),
      });
    }

    const modelProvider = createModelProvider(provider.id, provider.url, modelProviderApiKey);

    const streamStart = performance.now();
    let firstOutputAt: number | undefined;
    let reasoningStartAt: number | undefined;
    let reasoningEndAt: number | undefined;

    const result = streamText({
      model: modelProvider.chatModel(modelId),
      instructions,
      messages: await convertToModelMessages(messages),
      onChunk({ chunk }) {
        if (chunk.type === "reasoning-delta" && !reasoningStartAt) {
          reasoningStartAt = performance.now();
        }
        if (chunk.type === "reasoning-end") {
          reasoningEndAt = performance.now();
        }
        if (
          !firstOutputAt &&
          (chunk.type === "text-delta" || chunk.type === "reasoning-delta")
        ) {
          firstOutputAt = performance.now();
        }
      },
      onError({ error }) {
        log("CHAT", `error: ${String(error)}`);
      },
      onEnd({ text, reasoning, finishReason, usage, response, steps }) {
        const stepPerformance = steps?.at(-1)?.performance;
        // reasoningTimeMs is measured from onChunk (more precise than
        // stepPerformance which starts counting from step begin).
        const reasoningTimeMs = reasoningStartAt && reasoningEndAt
          ? reasoningEndAt - reasoningStartAt
          : undefined;

        const stats: MessageStats = {
          provider: provider.name,
          modelId,
          responseId: response?.id,
          finishReason,
          usage: mapUsageToStats(usage),
          // For the persisted message we keep the SDK's own performance figures
          // (incl. timeToFirstOutputMs) — it has access to richer timing data
          // than our coarse streamStart/TTFT measurement above.
          // reasoningTimeMs is our own measurement because the SDK doesn't
          // expose reasoning-specific timing yet.
          performance: stepPerformance
            ? {
              responseTimeMs: stepPerformance.responseTimeMs,
              timeToFirstOutputMs: stepPerformance.timeToFirstOutputMs,
              reasoningTimeMs,
              outputTokensPerSecond: stepPerformance.outputTokensPerSecond,
            }
            : undefined,
        };

        // Persist the assistant reply after the stream ends. Fire-and-forget
        // with a logged catch: the stream response is already on its way to
        // the client, so a persist failure here must not fail the (already-
        // completed) response — but we log it loudly so a silent message drop
        // is visible in the logs.
        conversationRepo
          .appendMessage(conversationId, {
            id: crypto.randomUUID(),
            role: "assistant",
            text,
            reasoning: extractReasoningText(reasoning),
            stats,
            createdAt: new Date().toISOString(),
          })
          .catch((err) => {
            log("CHAT", `failed to persist assistant message: ${String(err)}`);
          });
      },
    });

    log("CHAT", "stream started");
    return result.toUIMessageStream({
      sendReasoning: true,
      messageMetadata({ part }) {
        // Match the shape the client reads (m.metadata.stats) and the shape
        // we seed from persisted messages (metadata: { starred, stats }), so
        // stats render identically during streaming and after a reload.
        if (part.type === "start") {
          return { starred: false };
        }
        if (part.type === "finish") {
          return {
            stats: buildStreamMessageStats({
              provider,
              modelId,
              finishReason: part.finishReason,
              totalUsage: part.totalUsage,
              streamStart,
              firstOutputAt,
            }),
          };
        }
        return undefined;
      },
    });
  }

  return { streamChat };
}

export type ChatService = ReturnType<typeof createChatService>;

// Last user message in the array; used for logging and persistence.
function findLastUserMessage(messages: UIMessage[]): UIMessage | undefined {
  return [...messages].reverse().find((m) => m.role === "user");
}

// Join the text parts of a UIMessage into a single string for persistence.
// Non-text parts are dropped because the messages.text column is plain text.
function uiMessageText(msg: UIMessage): string {
  let text = "";
  for (const part of msg.parts) {
    if (part.type === "text") text += part.text;
  }
  return text;
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

// The AI SDK may return reasoning either as a plain string or as an array of
// reasoning parts (depending on the provider / SDK version). Normalize it to a
// single string suitable for persistence.
function extractReasoningText(
  reasoning:
    | string
    | Array<{ type: string; text?: string }>
    | undefined,
): string | undefined {
  if (!reasoning) return undefined;
  if (typeof reasoning === "string") return reasoning || undefined;

  const text = reasoning
    .filter((r) => r.type === "reasoning" && typeof r.text === "string")
    .map((r) => r.text)
    .join("");
  return text || undefined;
}

// Build the stats object that rides along with the streamed assistant message
// via `toUIMessageStream` messageMetadata. Attached to the in-flight UI
// message so the client can show them right after generation, without a
// separate fetch. Note: this is a best-effort approximation — the SDK's
// `onEnd` (which feeds persistence) has richer timing data via `steps`.
// reasoningTimeMs is excluded here because the client measures it locally
// for instant display when reasoning finishes.
type StreamStatsInput = {
  provider: { id: string; name: string };
  modelId: string;
  finishReason?: string;
  totalUsage?: UsageLike;
  streamStart: number;
  firstOutputAt?: number;
};

// Structural shape of the AI SDK's usage object. Declared locally so we don't
// have to import the (unstable) internal type and so callers can pass subsets.
type UsageLike = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  outputTokenDetails?: {
    reasoningTokens?: number;
    textTokens?: number;
  };
};

function buildStreamMessageStats(
  { provider, modelId, finishReason, totalUsage, streamStart, firstOutputAt }:
    StreamStatsInput,
): MessageStats {
  const responseTimeMs = performance.now() - streamStart;
  const outputTokens = totalUsage?.outputTokens;

  return {
    provider: provider.name,
    modelId,
    finishReason,
    usage: mapUsageToStats(totalUsage),
    performance: {
      responseTimeMs,
      timeToFirstOutputMs: firstOutputAt
        ? firstOutputAt - streamStart
        : undefined,
      outputTokensPerSecond: outputTokens && responseTimeMs > 0
        ? outputTokens / (responseTimeMs / 1000)
        : undefined,
    },
  };
}

// Normalize the SDK's usage object into our stats.usage shape. Used both from
// `onEnd` (persistence) and `buildStreamMessageStats` (live streaming), so the
// two paths never drift in what they record.
function mapUsageToStats(
  usage: UsageLike | undefined,
): MessageStats["usage"] {
  if (!usage) return undefined;
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    reasoningTokens: usage.outputTokenDetails?.reasoningTokens,
    textTokens: usage.outputTokenDetails?.textTokens,
  };
}