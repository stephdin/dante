import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createModelProvider } from "../lib/modelProvider.ts";
import { AppError } from "../lib/errors.ts";
import { log } from "../lib/log.ts";
import { conversationRepository } from "../repositories/conversationRepository.ts";
import * as configService from "./configService.ts";

export type ChatRequestBody = {
  messages: UIMessage[];
  conversationId: string;
  presetId?: string;
};

// Orchestrates a chat request: resolves provider/model/instructions, persists
// the latest user message, streams the assistant reply, and persists the
// assistant message when the stream ends. Throws AppError for 4xx/5xx cases
// that should be surfaced as HTTP responses.
export async function streamChat({ messages, conversationId, presetId }: ChatRequestBody) {
  const { provider, modelId, instructions } = await configService.resolveChatConfig(
    presetId,
  );

  const lastUser = findLastUserMessage(messages);
  const preview = lastUser ? truncate(uiMessageText(lastUser), 50) : "";
  log(
    "CHAT",
    `request conversation=${conversationId} preset=${presetId ?? "-"} provider=${provider.id} model=${modelId} messages=${messages.length} userMsg="${preview}"`,
  );

  const conversation = await conversationRepository.getConversation(conversationId);
  if (!conversation) {
    log("CHAT", `rejected: conversation ${conversationId} not found`);
    throw new AppError("conversation not found", 404);
  }

  const apiKey = Deno.env.get("MODEL_PROVIDER_API_KEY");
  if (!apiKey) {
    log("CHAT", "rejected: MODEL_PROVIDER_API_KEY not set");
    throw new AppError("MODEL_PROVIDER_API_KEY not set", 500);
  }

  // Persist the new user message before streaming so it survives a refresh
  // even if the stream fails or the client disconnects.
  if (lastUser) {
    await conversationRepository.appendMessage(conversationId, {
      id: crypto.randomUUID(),
      role: "user",
      text: uiMessageText(lastUser),
      createdAt: new Date().toISOString(),
    });
  }

  const modelProvider = createModelProvider(provider.id, provider.url, apiKey);

  const result = streamText({
    model: modelProvider.chatModel(modelId),
    instructions,
    messages: await convertToModelMessages(messages),
    onError({ error }) {
      log("CHAT", `error: ${String(error)}`);
    },
    onEnd({ text }) {
      // Persist the assistant reply after streaming. Fire-and-forget is fine
      // for the in-memory mock, but should probably be awaited once SQLite
      // lands so errors don't silently drop messages.
      conversationRepository
        .appendMessage(conversationId, {
          id: crypto.randomUUID(),
          role: "assistant",
          text,
          createdAt: new Date().toISOString(),
        })
        .catch((err) => {
          log("CHAT", `failed to persist assistant message: ${String(err)}`);
        });
    },
  });

  log("CHAT", "stream started");
  return result.stream;
}

// Last user message in the array; used for logging and persistence.
function findLastUserMessage(messages: UIMessage[]): UIMessage | undefined {
  return [...messages].reverse().find((m) => m.role === "user");
}

// Join the text parts of a UIMessage into a single string for persistence.
// Non-text parts are ignored because the mock storage only stores plain text.
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
