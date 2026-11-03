import type { UIMessage } from "ai"

/** The plain text of a message, without reasoning and tool calls. */
export function messageText(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("")
}
