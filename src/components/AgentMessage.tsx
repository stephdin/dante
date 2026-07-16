import { memo, useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Box,
  Collapse,
  Group,
  Paper,
  Text,
  Typography,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconRefresh,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MessageStats } from "@shared/types.ts";
import { useDisplaySettings } from "../context/DisplaySettingsContext.tsx";
import { DEBUG_MESSAGE_STATS } from "../config/debug.ts";
import { formatTime } from "../utils/formatDate.ts";
import { useMessageActions } from "./useMessageActions.ts";
import classes from "./AgentMessage.module.css";

type AgentMessageProps = {
  id: string;
  text: string;
  reasoning?: string;
  stats?: MessageStats;
  createdAt?: string | Date;
  last?: boolean;
  reasoningStreaming?: boolean;
  starred?: boolean;
  waiting?: boolean;
  status?: "generating" | "complete" | "error" | "cancelled";
  // Display name of the preset that produced this message. Resolved by the
  // parent from the message's presetId + the config. undefined = no preset
  // info available (e.g. messages from before the migration).
  presetName?: string;
  onStar: (id: string, starred: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRegenerate: (id: string) => Promise<void>;
};

export const AgentMessage = memo(
  function AgentMessage({
    id,
    text,
    reasoning,
    stats,
    createdAt,
    last = false,
    reasoningStreaming = false,
    starred = false,
    waiting = false,
    status,
    presetName,
    onStar,
    onDelete,
    onRegenerate,
  }: AgentMessageProps) {
    const { ref, actionsStyle } = useMessageActions();
    const { settings } = useDisplaySettings();
    const [copied, setCopied] = useState(false);
    const [starring, setStarring] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    const busy = status === "generating";

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // Ignore clipboard errors.
      }
    };

    const handleStar = async () => {
      setStarring(true);
      try {
        await onStar(id, !starred);
      } finally {
        setStarring(false);
      }
    };

    const handleRegenerate = async () => {
      setRegenerating(true);
      try {
        await onRegenerate(id);
      } finally {
        setRegenerating(false);
      }
    };

    const handleDelete = async () => {
      setDeleting(true);
      try {
        await onDelete(id);
      } finally {
        setDeleting(false);
      }
    };
    // Initial state only: the setting controls whether the block starts
    // expanded when the message mounts. The user can still toggle it per
    // message, and changing the setting doesn't retroactively affect
    // already-rendered messages.
    const [reasoningOpen, setReasoningOpen] = useState(
      () => settings.expandReasoningByDefault,
    );
    const hasReasoning = !!reasoning && reasoning.trim().length > 0;

    // Track reasoning duration client-side so we can show it immediately
    // when reasoning finishes, rather than waiting for the full message
    // stats (which only arrive on the finish part).
    const reasoningStartAt = useRef<number | null>(null);
    const [localReasoningTimeMs, setLocalReasoningTimeMs] = useState<number>();

    useEffect(() => {
      if (reasoningStreaming && reasoningStartAt.current == null) {
        reasoningStartAt.current = performance.now();
      }
      if (!reasoningStreaming && reasoningStartAt.current != null) {
        setLocalReasoningTimeMs(performance.now() - reasoningStartAt.current);
        reasoningStartAt.current = null;
      }
    }, [reasoningStreaming]);

    const reasoningTimeMs =
      localReasoningTimeMs ?? stats?.performance?.reasoningTimeMs;
    const starredStyle: CSSProperties = starred
      ? {
          backgroundColor:
            "color-mix(in srgb, var(--mantine-color-yellow-4) 10%, transparent)",
          border:
            "1px solid light-dark(color-mix(in srgb, var(--mantine-color-yellow-3) 50%, transparent), color-mix(in srgb, var(--mantine-color-yellow-6) 50%, transparent))",
        }
      : {};

    return (
      <Box ref={ref}>
        <Paper p={starred ? "sm" : 0} radius="md" style={starredStyle}>
          {waiting && (
            <Text c="dimmed" fz="xs" mb="xs">
              Warte auf Antwort…
            </Text>
          )}
          {hasReasoning && (
            <Box mb="xs">
              <UnstyledButton
                onClick={() => setReasoningOpen((o) => !o)}
                c="dimmed"
                fz="xs"
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <IconChevronDown
                  size={14}
                  style={{
                    transform: reasoningOpen
                      ? "rotate(0deg)"
                      : "rotate(-90deg)",
                    transition: "transform 120ms ease",
                  }}
                />
                {reasoningStreaming
                  ? "Denke nach…"
                  : reasoningTimeMs
                    ? `Nachgedacht f\u00fcr ${formatDuration(reasoningTimeMs)}`
                    : "Nachgedacht"}
              </UnstyledButton>
              <Collapse expanded={reasoningOpen}>
                <Text
                  size="xs"
                  c="dimmed"
                  fs="italic"
                  mt={4}
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {reasoning}
                </Text>
              </Collapse>
            </Box>
          )}
          <Typography className={classes.markdown}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </Typography>
          {/* Debug overlay: per-message provider stats. Shown as a single
            compact line under the message content. The preset name is shown
            even when no other stats are available, so users can see at a
            glance which model produced the reply. */}
          {(settings.showProviderStats || DEBUG_MESSAGE_STATS) &&
            (stats || presetName) && (
              <Text size="xs" c="dimmed" mt="xs">
                {formatMessageStats(stats ?? ({} as MessageStats), presetName)}
              </Text>
            )}
        </Paper>
        <Group justify="flex-start" align="center" gap={4} mt="xs">
          {settings.showTimestamps && createdAt && (
            <Text size="xs" c="dimmed">
              {formatTime(createdAt)}
            </Text>
          )}
          {starred && !busy && (
            <ActionIcon
              variant="transparent"
              color="yellow"
              size="sm"
              title="Markierung entfernen"
              loading={starring}
              disabled={starring}
              onClick={handleStar}
            >
              <IconStarFilled size={14} />
            </ActionIcon>
          )}
          {!busy && (
            <Group gap={4} style={actionsStyle}>
              {!starred && (
                <ActionIcon
                  variant="transparent"
                  c="dimmed"
                  size="sm"
                  title="Markieren"
                  loading={starring}
                  disabled={starring}
                  onClick={handleStar}
                >
                  <IconStar size={14} />
                </ActionIcon>
              )}
              <ActionIcon
                variant="transparent"
                c="dimmed"
                size="sm"
                title={copied ? "Kopiert" : "Kopieren"}
                onClick={handleCopy}
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
              {last && (
                <>
                  <ActionIcon
                    variant="transparent"
                    c="dimmed"
                    size="sm"
                    title="Neu generieren"
                    loading={regenerating}
                    disabled={regenerating || deleting}
                    onClick={handleRegenerate}
                  >
                    <IconRefresh size={14} />
                  </ActionIcon>
                  <ActionIcon
                    variant="transparent"
                    c="dimmed"
                    size="sm"
                    title="Löschen"
                    loading={deleting}
                    disabled={regenerating || deleting}
                    onClick={handleDelete}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </>
              )}
            </Group>
          )}
        </Group>
      </Box>
    );
  },
  (prev, next) =>
    prev.text === next.text &&
    prev.reasoning === next.reasoning &&
    prev.stats === next.stats &&
    prev.reasoningStreaming === next.reasoningStreaming &&
    prev.starred === next.starred &&
    prev.waiting === next.waiting &&
    prev.status === next.status &&
    prev.last === next.last &&
    prev.presetName === next.presetName &&
    createdAtEpoch(prev.createdAt) === createdAtEpoch(next.createdAt),
);

/** Normalise createdAt (Date | ISO string | undefined) to epoch ms for stable
 *  comparison across renders where the same instant may be represented as
 *  different types. */
function createdAtEpoch(v?: string | Date): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") return new Date(v).getTime();
  return 0;
}

// Compact single-line summary of provider/token/performance metadata shown
// under each assistant message. Empty groups are omitted so the line stays
// as terse as possible.
function formatMessageStats(stats: MessageStats, presetName?: string): string {
  const groups: string[] = [];

  // Identity: "Preset "Quick GPT" · openai / gpt-4-mini"
  // The preset name is the user-facing label, so it goes first. We only show
  // it when present — legacy messages from before the migration won't have it.
  // finishReason is appended only when abnormal (see below).
  const identity: string[] = [];
  if (presetName) identity.push(presetName);
  const model = [stats.provider, stats.modelId].filter(Boolean).join(" / ");
  if (model) identity.push(model);
  // Only surface finishReason when it's abnormal. "stop" is the normal
  // end-of-completion value and adds no information; "length" (truncated by
  // max_tokens), "content-filter", etc. are worth showing so the user knows
  // the reply was cut short.
  if (stats.finishReason && stats.finishReason !== "stop")
    identity.push(stats.finishReason);
  if (identity.length) groups.push(identity.join(" · "));

  // Token usage: "tokens 1.4k in · 487 out · 89 reasoning · 1.9k total"
  //
  // The reasoning/text split is only shown when the provider actually reports
  // reasoning tokens. Some OpenAI-compatible providers stream
  // `reasoning_content` but leave `reasoning_tokens` unset, so the SDK reports
  // 0 reasoning + full completion_tokens as text — showing that split would be
  // misleading because we'd claim "no thinking happened" even though the user
  // just read a reasoning block.
  const usage = stats.usage;
  if (usage) {
    const tokens: string[] = [];
    if (usage.inputTokens !== undefined)
      tokens.push(`${formatTokens(usage.inputTokens)} in`);
    if (usage.outputTokens !== undefined)
      tokens.push(`${formatTokens(usage.outputTokens)} out`);
    if ((usage.reasoningTokens ?? 0) > 0) {
      if (usage.reasoningTokens !== undefined)
        tokens.push(`${formatTokens(usage.reasoningTokens)} reasoning`);
      if (usage.textTokens !== undefined)
        tokens.push(`${formatTokens(usage.textTokens)} text`);
    }
    if (usage.totalTokens !== undefined)
      tokens.push(`${formatTokens(usage.totalTokens)} total`);
    if (tokens.length) groups.push(`${tokens.join(" · ")}`);
  }

  // Performance: "perf 1.2s · ttft 230ms · 82 tok/s"
  const perf = stats.performance;
  if (perf) {
    const perfParts: string[] = [];
    if (perf.responseTimeMs !== undefined)
      perfParts.push(`total ${formatDuration(perf.responseTimeMs)}`);
    if (perf.timeToFirstOutputMs !== undefined)
      perfParts.push(`ttft ${formatDuration(perf.timeToFirstOutputMs)}`);
    if (perf.outputTokensPerSecond !== undefined)
      perfParts.push(`${Math.round(perf.outputTokensPerSecond)} tok/s`);
    if (perfParts.length) groups.push(`${perfParts.join(" · ")}`);
  }

  return groups.join(" · ");
}

// Compactify token counts: 1234 → "1.2k", 1_500_000 → "1.5M". Falls back to
// the raw number for small counts so short chats stay precise.
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// Human-friendly durations: 1230ms → "1.2s", 230ms → "230ms".
function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(0)}s`;
  return `${Math.round(ms)}ms`;
}
