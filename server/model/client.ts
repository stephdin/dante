import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { Message, MessagePart } from "../../shared/types.ts";

export type StreamResult = {
  stream: AsyncIterable<MessagePart>;
  finishReason: Promise<string>;
  usage: Promise<{
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }>;
};

/**
 * Stream chat completions from any OpenAI-compatible or Anthropic provider.
 */
export function streamChat(params: {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  messages: Message[];
  systemPrompt?: string;
  providerType: "openai-compatible" | "anthropic";
}): StreamResult {
  const provider =
    params.providerType === "anthropic"
      ? createAnthropic({ apiKey: params.apiKey, baseURL: params.baseUrl })
      : createOpenAICompatible({
          apiKey: params.apiKey,
          baseURL: params.baseUrl,
          name: "dante",
        });

  // Both providers can be called directly: provider(modelId) returns a language model.
  // deno-lint-ignore no-explicit-any
  const model =
    (provider as any)(params.modelId) ??
    (provider as any).chatModel?.(params.modelId);

  const result = streamText({
    model,
    system: params.systemPrompt,
    messages: params.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.parts
        .filter((p) => p.type === "text" || p.type === "reasoning")
        .map((p) => p.text)
        .join(""),
    })),
  });

  return {
    stream: streamParts(result),
    finishReason: Promise.resolve(result.finishReason),
    usage: Promise.resolve(result.usage).then((u) => ({
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      totalTokens: u.totalTokens,
    })),
  };
}

async function* streamParts(
  result: ReturnType<typeof streamText>,
): AsyncGenerator<MessagePart> {
  for await (const chunk of result.fullStream) {
    const c = chunk as unknown as Record<string, unknown>;
    const text =
      (c.textDelta as string) ??
      (c.text as string) ??
      (c.content as string) ??
      "";

    if (chunk.type === "text-delta" || chunk.type === "text") {
      if (text) yield { type: "text", text };
    } else if (chunk.type === "reasoning-delta" || chunk.type === "reasoning") {
      if (text) yield { type: "reasoning", text };
    }
  }
}
