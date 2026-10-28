import { useRef, useState } from "react"
import { useChat, type Chat } from "@ai-sdk/react"
import type { UIMessage } from "ai"

import { Markdown } from "@/components/markdown"
import { AssistantActions, UserActions } from "@/components/message-actions"
import { PromptInput } from "@/components/prompt-input"
import { Reasoning } from "@/components/reasoning"
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
import { stopRun } from "@/lib/api"
import { getMessageText } from "@/lib/chat"

export function ChatView({ chat }: { chat: Chat<UIMessage> }) {
  const { messages, sendMessage, regenerate, stop, status } = useChat({ chat })
  const busy = status === "submitted" || status === "streaming"
  const lastId = messages.at(-1)?.id

  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function edit(text: string) {
    setDraft(text)
    inputRef.current?.focus()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-3xl p-4">
              {messages.map((message) => {
                const text = getMessageText(message)
                const streaming = busy && message.id === lastId

                return (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === "user"}
                  >
                    {message.role === "user" ? (
                      <Message align="end">
                        <MessageContent>
                          <Bubble align="end" variant="muted">
                            <BubbleContent>{text}</BubbleContent>
                          </Bubble>
                          <UserActions text={text} onEdit={() => edit(text)} />
                        </MessageContent>
                      </Message>
                    ) : (
                      <Message>
                        <MessageContent>
                          <Reasoning
                            parts={message.parts.filter(
                              (part) => part.type === "reasoning"
                            )}
                            streaming={streaming}
                          />
                          <Markdown streaming={streaming}>{text}</Markdown>
                          {!streaming && (
                            <AssistantActions
                              text={text}
                              onRetry={
                                message.id === lastId && !busy
                                  ? () => regenerate({ messageId: message.id })
                                  : undefined
                              }
                            />
                          )}
                        </MessageContent>
                      </Message>
                    )}
                  </MessageScrollerItem>
                )
              })}
              {status === "submitted" && (
                <p className="shimmer text-sm text-muted-foreground motion-reduce:shimmer-none">
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
          ref={inputRef}
          value={draft}
          onValueChange={setDraft}
          busy={busy}
          onStop={() => {
            void stopRun(chat.id)
            void stop()
          }}
          onSubmit={(text) => sendMessage({ text })}
        />
      </div>
    </div>
  )
}
