import { useEffect, useRef, useState, useCallback } from "react";
import { useConversation } from "./queries.ts";
import * as events from "./events.ts";
import type { Message, MessagePart, MessageStats } from "../../shared/types.ts";

// ── Rendering shape ─────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  reasoning?: string;
  stats?: MessageStats;
  createdAt: string;
  status: "generating" | "complete" | "error";
  waiting: boolean;
  reasoningStreaming: boolean;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function uuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function partsToText(parts: MessagePart[]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function partsToReasoning(parts: MessagePart[]): string {
  return parts
    .filter((p) => p.type === "reasoning")
    .map((p) => p.text)
    .join("");
}

function serverMessageToChat(m: Message): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    text: partsToText(m.parts),
    reasoning: partsToReasoning(m.parts) || undefined,
    stats: m.stats,
    createdAt: m.createdAt,
    status: m.status as "generating" | "complete" | "error",
    waiting: m.status === "generating" && partsToText(m.parts).length === 0,
    reasoningStreaming: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useChatV1(conversationId: string) {
  const {
    data: conversation,
    loading,
    error,
  } = useConversation(conversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const seededRef = useRef(false);

  // Seed from server on first load or reconnect
  useEffect(() => {
    if (!conversation || seededRef.current) return;
    seededRef.current = true;
    setMessages(conversation.messages.map(serverMessageToChat));
  }, [conversation]);

  // Subscribe to WS events for this conversation
  useEffect(() => {
    events.subscribe(conversationId);

    const unsubs = [
      events.on("chat.user-message", (data) => {
        console.log("[chat] chat.user-message", data);
        const parts = data.parts as MessagePart[] | undefined;
        if (!parts) return;
        setMessages((prev) => {
          // Dedup — the sender already added this locally with a temp ID.
          // Match by text content since the broadcast may arrive before
          // the POST response swaps the temp ID for the real one.
          if (
            prev.some(
              (m) =>
                m.role === "user" &&
                m.text === partsToText(parts) &&
                m.status === "complete",
            )
          )
            return prev;
          return [
            ...prev,
            {
              id: data.messageId as string,
              role: "user",
              text: partsToText(parts),
              createdAt: data.createdAt as string,
              status: "complete",
              waiting: false,
              reasoningStreaming: false,
            },
          ];
        });
      }),

      events.on("chat.token", (data) => {
        console.log("[chat] chat.token", data);
        const parts = data.parts as MessagePart[] | undefined;
        if (!parts) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId
              ? {
                  ...m,
                  text: partsToText(parts),
                  reasoning: partsToReasoning(parts) || undefined,
                  waiting: false,
                  reasoningStreaming: parts.some((p) => p.type === "reasoning"),
                }
              : m,
          ),
        );
        if (!streaming) setStreaming(true);
      }),

      events.on("chat.done", (data) => {
        console.log("[chat] chat.done", data);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId ? { ...m, status: "complete" } : m,
          ),
        );
        setStreaming(false);
      }),

      events.on("chat.error", (data) => {
        console.log("[chat] chat.error", data);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId ? { ...m, status: "error" } : m,
          ),
        );
        setStreaming(false);
        setChatError((data.error as string) ?? "Generation failed");
      }),

      events.on("chat.cancelled", (data) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId ? { ...m, status: "complete" } : m,
          ),
        );
        setStreaming(false);
      }),
    ];

    return () => {
      events.unsubscribe(conversationId);
      for (const unsub of unsubs) unsub();
    };
  }, [conversationId]);

  // Re-seed on reconnect (WS disconnected and reconnected)
  useEffect(() => {
    return events.on("reconnect", () => {
      seededRef.current = false;
    });
  }, [conversationId]);

  const sendMessage = useCallback(
    async (text: string, presetId?: string) => {
      setChatError(null);
      const tempId = uuid();
      const userMsg: ChatMessage = {
        id: tempId,
        role: "user",
        text,
        createdAt: new Date().toISOString(),
        status: "complete",
        waiting: false,
        reasoningStreaming: false,
      };
      const assistantMsg: ChatMessage = {
        id: tempId + "-asst",
        role: "assistant",
        text: "",
        createdAt: new Date().toISOString(),
        status: "generating",
        waiting: true,
        reasoningStreaming: false,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer 1337",
          },
          body: JSON.stringify({
            conversationId,
            text,
            presetId,
          }),
        });

        if (!res.ok) {
          throw new Error(`Chat failed: ${res.status}`);
        }

        const { messageId, userMessageId } = (await res.json()) as {
          jobId: string;
          messageId: string;
          userMessageId: string;
        };

        // Replace temp IDs with real server IDs so broadcasts match
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: userMessageId }
              : m.id === assistantMsg.id
                ? { ...m, id: messageId }
                : m,
          ),
        );
      } catch (err) {
        setChatError(
          err instanceof Error ? err.message : "Chat request failed",
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, status: "error" } : m,
          ),
        );
      }
    },
    [conversationId],
  );

  return { messages, sendMessage, streaming, loading, error, chatError };
}
