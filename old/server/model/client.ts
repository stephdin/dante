import { streamText, type LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { Message, MessagePart, SdkType } from "../../shared/types.ts";

export type StreamResult = {
  stream: AsyncIterable<MessagePart>;
  finishReason: Promise<string>;
  usage: Promise<{
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
    textTokens?: number;
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
  modelType: SdkType;
}): StreamResult {
  // Both factories return callable providers: provider(modelId) → LanguageModel.
  let model: LanguageModel;
  if (params.modelType === "anthropic") {
    model = createAnthropic({
      apiKey: params.apiKey,
      baseURL: params.baseUrl,
    })(params.modelId);
  } else {
    model = createOpenAICompatible({
      apiKey: params.apiKey,
      baseURL: params.baseUrl,
      name: "dante",
    })(params.modelId);
  }

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
      reasoningTokens: u.outputTokenDetails?.reasoningTokens,
      textTokens: u.outputTokenDetails?.textTokens,
    })),
  };
}

async function* streamParts(
  result: ReturnType<typeof streamText>,
): AsyncGenerator<MessagePart> {
  for await (const chunk of result.fullStream) {
    if (chunk.type === "text-delta") {
      if (chunk.text) yield { type: "text", text: chunk.text };
    } else if (chunk.type === "reasoning-delta") {
      if (chunk.text) yield { type: "reasoning", text: chunk.text };
    }
  }
}
