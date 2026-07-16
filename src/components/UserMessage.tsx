import { memo, useState } from "react";
import { ActionIcon, Box, Group, Paper, Text } from "@mantine/core";
import {
  IconCheck,
  IconCopy,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useDisplaySettings } from "../context/DisplaySettingsContext.tsx";
import { formatTime } from "../utils/formatDate.ts";
import { useMessageActions } from "./useMessageActions.ts";

export const UserMessage = memo(function UserMessage({
  id,
  text,
  createdAt,
  last = false,
  status,
  onDelete,
  onRegenerate,
}: {
  id: string;
  text: string;
  createdAt?: string | Date;
  last?: boolean;
  status?: "generating" | "complete" | "error" | "cancelled";
  onDelete: (id: string) => Promise<void>;
  onRegenerate: (id: string) => Promise<void>;
}) {
  const { ref, actionsStyle } = useMessageActions();
  const { settings } = useDisplaySettings();
  const [copied, setCopied] = useState(false);
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
  return (
    <Box ref={ref}>
      <Group justify="flex-end">
        <Paper
          p="sm"
          radius="md"
          maw="80%"
          bg="primary"
          style={{ whiteSpace: "pre-wrap" }}
        >
          <Text size="sm" c="onPrimary">
            {text}
          </Text>
        </Paper>
      </Group>
      <Group justify="flex-end" align="center" gap={4} mt="xs">
        <Group style={actionsStyle}>
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
                disabled={busy || regenerating || deleting}
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
                disabled={busy || regenerating || deleting}
                onClick={handleDelete}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </>
          )}
        </Group>

        {settings.showTimestamps && createdAt && (
          <Text size="xs" c="dimmed">
            {formatTime(createdAt)}
          </Text>
        )}
      </Group>
    </Box>
  );
});
