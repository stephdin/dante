import { useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

export type { UIMessage };

// Wraps the AI SDK's useChat with our /api/chat transport, scoped to a single
// conversation id. The component using this is keyed by id (see
// ConversationPage), so each conversation gets a fresh chat instance.
export function useConversationChat(conversationId: string) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );
  return useChat({ id: conversationId, transport });
}

// Join the text parts of a UIMessage into a single string (for rendering).
export function uiMessageText(msg: UIMessage): string {
  let text = "";
  for (const part of msg.parts) {
    if (part.type === "text") text += part.text;
  }
  return text;
}

// Join the reasoning parts of a UIMessage (the model's thinking, streamed
// before the answer). Empty when the model doesn't emit reasoning tokens.
export function uiMessageReasoning(msg: UIMessage): string {
  let reasoning = "";
  for (const part of msg.parts) {
    if (part.type === "reasoning") reasoning += part.text;
  }
  return reasoning;
}
