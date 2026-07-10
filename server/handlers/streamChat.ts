import type { Context } from "hono";
import { createUIMessageStreamResponse } from "ai";

import { chatRequestSchema } from "../schemas/chat.ts";
import type { ChatService, ChatRequestBody } from "../services/chatService.ts";

// Factory: returns the route handler bound to the supplied chat service. The
// service (and the repositories / API key it closes over) is injected by
// `main.ts`, so this module no longer imports a module-eval-time singleton.
export function streamChat(svc: ChatService) {
  // Validates the chat request body and streams the assistant reply as a
  // UI-message stream (SSE). Reasoning tokens and message stats are forwarded
  // so the client can render the model's thinking and debug metadata. ZodError
  // raised by `parse()` falls through to main.ts's onError, which maps it to
  // a 422 with the full issues array rather than a single-message 400.
  return async (c: Context) => {
    const rawBody = await c.req.json();
    const data = chatRequestSchema.parse(rawBody) as ChatRequestBody;
    const stream = await svc.streamChat(data);
    return createUIMessageStreamResponse({ stream });
  };
}