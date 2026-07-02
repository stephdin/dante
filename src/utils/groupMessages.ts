import { formatRelativeDate } from "./formatDate.ts";

// Minimal shape both the server's Message and the AI SDK's UIMessage can be
// mapped to, so the chat list and date dividers share one code path.
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  reasoning?: string;
  createdAt: string | Date;
  starred?: boolean;
};

export type ChatItem =
  | { kind: "divider"; label: string }
  | { kind: "message"; message: ChatMessage; last: boolean };

// Flattens messages into a render list, inserting a divider whenever the
// calendar day changes. No divider is emitted before the first message, so the
// top of the thread stays clean (matching the original mockup layout).
export function buildChatItems(messages: ChatMessage[]): ChatItem[] {
  const items: ChatItem[] = [];
  let lastDay = "";
  messages.forEach((message, index) => {
    const day = new Date(message.createdAt).toDateString();
    if (lastDay !== "" && day !== lastDay) {
      items.push({ kind: "divider", label: formatRelativeDate(message.createdAt) });
    }
    lastDay = day;
    items.push({
      kind: "message",
      message,
      last: index === messages.length - 1,
    });
  });
  return items;
}
