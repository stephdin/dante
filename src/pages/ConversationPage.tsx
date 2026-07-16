import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader, Stack, Text } from "@mantine/core";

import { ChatLayout } from "../components/ChatLayout.tsx";
import { AgentMessage } from "../components/AgentMessage.tsx";
import { DateDivider } from "../components/DateDivider.tsx";
import { UserMessage } from "../components/UserMessage.tsx";
import { useChatV1 } from "../api/useChatV1.ts";
import { useConfig } from "../api/queries.ts";
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
  const { data: config } = useConfig();

  const sentRef = useRef(false);

  // Auto-stick to bottom while streaming: when new tokens arrive, keep the
  // view pinned to the bottom — but only if the user is already there. If
  // they've scrolled up to read history, leave them be. The threshold is
  // generous (80px) because the scroll container has a large paddingBottom so
  // the "visual bottom" corresponds to scrollTop ≈ scrollHeight - padding.
  const atBottomRef = useRef(true);
  const BOTTOM_THRESHOLD_PX = 80;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      atBottomRef.current = distanceFromBottom <= BOTTOM_THRESHOLD_PX;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll to the bottom once when the conversation first finishes loading,
  // so the user lands on the latest message. The component is keyed by
  // conversation id, so switching conversations remounts and re-runs this.
  //
  // Messages load in two phases: useConversation flips `loading` off when the
  // fetch resolves, but the messages state in useChatV1 is seeded by a separate
  // effect that runs a tick later. So on the render where loading flips false,
  // messages is still empty — we must wait for messages to be non-empty before
  // scrolling, otherwise we'd no-op the scroll and then set the guard before
  // the real content arrives (which is exactly the refresh-stays-at-top bug).
  const scrolledToBottomRef = useRef(false);
  useLayoutEffect(() => {
    if (scrolledToBottomRef.current) return;
    if (loading || error) return;
    if (messages.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    scrolledToBottomRef.current = true;
    atBottomRef.current = true;
  }, [loading, error, messages]);

  // Auto-stick to bottom on every message update (streaming tokens, new
  // messages) — but only if the user is currently at the bottom. The initial
  // scroll-to-bottom above is separate because it runs even when atBottomRef
  // might be stale (the user can't have scrolled yet on a fresh mount).
  useLayoutEffect(() => {
    if (!scrolledToBottomRef.current) return;
    if (!atBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

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

  // Resolve the last-used preset from the message history. The most recent
  // user message's presetId is what the input should show on mount/reload.
  // Walk in reverse to find the newest user message with a presetId (older
  // messages may not have one if they pre-date the migration).
  const lastPresetId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "user" && m.presetId) return m.presetId;
    }
    return null;
  }, [messages]);

  const items = buildChatItems(messages);

  // Map presetId → preset name once, so per-message rendering doesn't have to
  // re-scan the presets array for every assistant message. Presets that no
  // longer exist in config (renamed/deleted) are silently omitted.
  const presetNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of config?.presets ?? []) map.set(p.id, p.name);
    return map;
  }, [config?.presets]);

  const busy = streaming;

  return (
    <ChatLayout
      ref={scrollRef}
      onSend={sendMessage}
      onStop={() => {}}
      busy={busy}
      defaultPresetId={lastPresetId}
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
                presetName={
                  item.message.presetId
                    ? presetNameById.get(item.message.presetId)
                    : undefined
                }
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
