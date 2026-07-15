import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader, Stack, Text } from "@mantine/core";

import { ChatLayout } from "../components/ChatLayout.tsx";
import { AgentMessage } from "../components/AgentMessage.tsx";
import { DateDivider } from "../components/DateDivider.tsx";
import { UserMessage } from "../components/UserMessage.tsx";
import { useChatV1 } from "../api/useChatV1.ts";
import { buildChatItems } from "../utils/groupMessages.ts";

export default function ConversationPage() {
  const { id } = useParams();
  if (!id) return null;
  return <ConversationView key={id} id={id} />;
}

function ConversationView({ id }: { id: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { messages, sendMessage, streaming, loading, error, chatError } =
    useChatV1(id);

  const sentRef = useRef(false);

  // Auto-send a pending first message routed in from /new.
  useEffect(() => {
    const state = location.state as {
      pendingMessage?: string;
      presetId?: string;
    } | null;
    if (!state?.pendingMessage || sentRef.current || loading) return;
    sentRef.current = true;
    sendMessage(state.pendingMessage, state.presetId);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, loading, sendMessage, id, navigate]);

  const busy = streaming;

  const items = buildChatItems(messages);

  return (
    <ChatLayout
      ref={scrollRef}
      onSend={sendMessage}
      onStop={() => {}}
      busy={busy}
    >
      {error ? (
        <Stack align="center" justify="center" style={{ minHeight: 200 }}>
          <Text size="sm" c="red" ta="center">
            Verbindung zum Server fehlgeschlagen.
          </Text>
        </Stack>
      ) : loading ? (
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
                createdAt={item.message.createdAt}
                last={item.last}
              />
            ) : (
              <AgentMessage
                key={item.message.id}
                text={item.message.text}
                reasoning={item.message.reasoning}
                stats={item.message.stats}
                createdAt={item.message.createdAt}
                starred={item.message.starred}
                last={item.last}
                reasoningStreaming={item.message.reasoningStreaming ?? false}
                waiting={item.message.waiting ?? false}
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
