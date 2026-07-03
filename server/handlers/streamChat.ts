import type { Context } from "hono";
import { createUIMessageStreamResponse } from "ai";

import { AppError } from "../lib/errors.ts";
import { chatRequestSchema } from "../schemas/chat.ts";
import * as chatService from "../services/chatService.ts";

// Validates the chat request body and streams the assistant reply as a
// UI-message stream (SSE). Reasoning tokens and message stats are forwarded so
// the client can render the model's thinking and debug metadata.
export async function streamChat(c: Context) {
  const rawBody = await c.req.json();
  const parsed = chatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0].message, 400);
  }

  const stream = await chatService.streamChat(
    parsed.data as chatService.ChatRequestBody,
  );
  return createUIMessageStreamResponse({ stream });
}
