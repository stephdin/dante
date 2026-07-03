import { ActionIcon, Box, Group, Paper, Text } from "@mantine/core";
import { IconCopy, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useMessageActions } from "./useMessageActions.ts";

export function UserMessage({
  text,
  last = false,
}: { text: string; last?: boolean }) {
  const { ref, actionsStyle } = useMessageActions();
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
      <Group justify="flex-end" gap={4} mt="xs" style={actionsStyle}>
        <ActionIcon variant="transparent" c="dimmed" size="sm" title="Kopieren">
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
    </Box>
  );
}
