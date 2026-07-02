import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader, Stack, Text } from "@mantine/core";
import type { UIMessage } from "ai";

import { ChatLayout } from "../components/ChatLayout.tsx";
import { AgentMessage } from "../components/AgentMessage.tsx";
import { DateDivider } from "../components/DateDivider.tsx";
import { UserMessage } from "../components/UserMessage.tsx";
import { useConversation } from "../api/queries.ts";
import {
  uiMessageReasoning,
  uiMessageText,
  useConversationChat,
} from "../api/useChat.ts";
import { buildChatItems } from "../utils/groupMessages.ts";
import type { Message } from "@shared/types.ts";

export function ConversationPage() {
  const { id } = useParams();
  if (!id) return null;
  // Keying the inner view by id gives each conversation a fresh useChat
  // instance, so message state never leaks between conversations.
  return <ConversationView key={id} id={id} />;
}

function ConversationView({ id }: { id: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { data: conversation, loading, error } = useConversation(id);
  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    error: chatError,
  } = useConversationChat(id);

  const seededRef = useRef(false);
  const sentRef = useRef(false);

  // Seed chat history from the server once it loads. Skipped if a message has
  // already been auto-sent from the /new flow, since that would clobber the
  // in-flight stream with the (empty) server history.
  useEffect(() => {
    if (!conversation || seededRef.current) return;
    seededRef.current = true;
    if (!sentRef.current) {
      setMessages(conversation.messages.map(toUIMessage));
    }
  }, [conversation, setMessages]);

  // Auto-send a pending first message routed in from /new, then clear the
  // router state so a refresh doesn't resend.
  useEffect(() => {
    const state = location.state as {
      pendingMessage?: string;
      presetId?: string;
    } | null;
    if (!state?.pendingMessage || sentRef.current || status !== "ready") return;
    sentRef.current = true;
    sendMessage(
      { text: state.pendingMessage },
      { body: { conversationId: id, presetId: state.presetId } },
    );
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, status, sendMessage, id, navigate]);

  // Keep the latest message in view as new chunks stream in.
/*   useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [messages]); */

  const busy = status === "submitted" || status === "streaming";

  function handleSend(text: string, presetId: string | undefined) {
    sendMessage({ text }, { body: { conversationId: id, presetId } });
  }

  const items = buildChatItems(
    messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      text: uiMessageText(m),
      reasoning: uiMessageReasoning(m),
      createdAt: messageCreatedAt(m),
      starred: (m.metadata as { starred?: boolean } | undefined)?.starred,
    })),
  );

  return (
    <ChatLayout ref={scrollRef} onSend={handleSend} onStop={stop} busy={busy}>
      {error ? (
        <Stack align="center" justify="center" style={{ minHeight: 200 }}>
          <Text size="sm" c="red" ta="center">
            Verbindung zum Server fehlgeschlagen.
          </Text>
        </Stack>
      ) : loading || !conversation ? (
        <Stack align="center" justify="center" style={{ minHeight: 200 }}>
          <Loader />
        </Stack>
      ) : (
        <Stack gap="xl">
          {items.map((item, index) =>
            item.kind === "divider" ? (
              <DateDivider key={`divider-${index}`} label={item.label} />
            ) : item.message.role === "user" ? (
              <UserMessage
                key={item.message.id}
                text={item.message.text}
                last={item.last}
              />
            ) : (
              <AgentMessage
                key={item.message.id}
                text={item.message.text}
                reasoning={item.message.reasoning}
                starred={item.message.starred}
                last={item.last}
              />
            ),
          )}
          {chatError ? (
            <Text size="sm" c="red" ta="center">
              Antwort konnte nicht generiert werden.
            </Text>
          ) : null}
        </Stack>
      )}
    </ChatLayout>
  );
}

// UIMessage doesn't declare `createdAt` in its type, but useChat attaches one at
// runtime; seeded messages carry it via the cast below. Fall back to "now" so
// streamed messages (which may lack it) group under today's divider.
function messageCreatedAt(m: UIMessage): string | Date {
  const created = (m as { createdAt?: Date | string }).createdAt;
  return created ?? new Date();
}

// Map a persisted server message into the AI SDK's UIMessage shape, carrying the
// `starred` flag through metadata so the highlight survives a round-trip.
function toUIMessage(m: Message): UIMessage {
  return {
    id: m.id,
    role: m.role,
    createdAt: new Date(m.createdAt),
    parts: [{ type: "text", text: m.text }],
    metadata: { starred: m.starred ?? false },
  } as UIMessage;
}
