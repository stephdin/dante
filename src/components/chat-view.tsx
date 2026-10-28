import { useChat, type Chat } from "@ai-sdk/react"
import type { UIMessage } from "ai"

import { PromptInput } from "@/components/prompt-input"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { getMessageText } from "@/lib/chat"

export function ChatView({ chat }: { chat: Chat<UIMessage> }) {
  const { messages, sendMessage, stop, status } = useChat({ chat })
  const busy = status === "submitted" || status === "streaming"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-3xl p-4">
              {messages.map((message) => (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={message.role === "user"}
                >
                  {message.role === "user" ? (
                    <Message align="end">
                      <MessageContent>
                        <Bubble align="end" variant="muted">
                          <BubbleContent>{getMessageText(message)}</BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  ) : (
                    <Message>
                      <MessageContent>
                        <p className="whitespace-pre-wrap">
                          {getMessageText(message)}
                        </p>
                      </MessageContent>
                    </Message>
                  )}
                </MessageScrollerItem>
              ))}
              {status === "submitted" && (
                <p className="animate-pulse text-sm text-muted-foreground">
                  Denkt nach…
                </p>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="mx-auto w-full max-w-3xl p-4 pt-0">
        <PromptInput
          busy={busy}
          onStop={stop}
          onSubmit={(text) => sendMessage({ text })}
        />
      </div>
    </div>
  )
}
