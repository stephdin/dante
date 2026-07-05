import { ActionIcon, Box, Group, Paper, Text } from "@mantine/core";
import { IconCopy, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useDisplaySettings } from "../context/DisplaySettingsContext.tsx";
import { formatTime } from "../utils/formatDate.ts";
import { useMessageActions } from "./useMessageActions.ts";

export function UserMessage({
  text,
  createdAt,
  last = false,
}: {
  text: string;
  createdAt?: string | Date;
  last?: boolean;
}) {
  const { ref, actionsStyle } = useMessageActions();
  const { settings } = useDisplaySettings();
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
            title="Kopieren"
          >
            <IconCopy size={14} />
          </ActionIcon>
          {last && (
            <>
              <ActionIcon
                variant="transparent"
                c="dimmed"
                size="sm"
                title="Neu generieren"
              >
                <IconRefresh size={14} />
              </ActionIcon>
              <ActionIcon
                variant="transparent"
                c="dimmed"
                size="sm"
                title="Löschen"
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
}
