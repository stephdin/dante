import { ActionIcon, Box, Group, Paper, Text } from "@mantine/core";
import { useHover, useMediaQuery } from "@mantine/hooks";
import type { CSSProperties } from "react";
import {
  IconCopy,
  IconRefresh,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";

// Reveals message actions on hover, and always shows them on touch devices
// (which don't have a real hover state). Replaces the old `.messageActions`
// hover CSS with a couple of Mantine hooks.
function useMessageActions() {
  const isTouch = useMediaQuery("(hover: none)");
  const { hovered, ref } = useHover<HTMLDivElement>();
  const opacity = isTouch ? 1 : hovered ? 1 : 0;
  const actionsStyle: CSSProperties = {
    opacity,
    transition: "opacity 120ms ease",
  };
  return { ref, actionsStyle };
}

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
        <ActionIcon variant="subtle" color="dimmed" size="sm" title="Copy">
          <IconCopy size={14} />
        </ActionIcon>
        {last && (
          <>
            <ActionIcon
              variant="subtle"
              color="dimmed"
              size="sm"
              title="Regenerate"
            >
              <IconRefresh size={14} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="dimmed"
              size="sm"
              title="Delete"
            >
              <IconTrash size={14} />
            </ActionIcon>
          </>
        )}
      </Group>
    </Box>
  );
}

export function AgentMessage({
  text,
  last = false,
  starred = false,
}: { text: string; last?: boolean; starred?: boolean }) {
  const { ref, actionsStyle } = useMessageActions();
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
      <Paper
        p={starred ? "sm" : 0}
        radius="md"
        style={{ whiteSpace: "pre-wrap", ...starredStyle }}
      >
        <Text size="md">{text}</Text>
      </Paper>
      <Group justify="flex-start" align="center" gap={4} mt="xs">
        {starred && (
          <ActionIcon variant="subtle" color="yellow" size="sm" title="Unstar">
            <IconStarFilled size={14} />
          </ActionIcon>
        )}
        <Group gap={4} style={actionsStyle}>
          {!starred && (
            <ActionIcon variant="subtle" color="dimmed" size="sm" title="Star">
              <IconStar size={14} />
            </ActionIcon>
          )}
          <ActionIcon variant="subtle" color="dimmed" size="sm" title="Copy">
            <IconCopy size={14} />
          </ActionIcon>
          {last && (
            <>
              <ActionIcon
                variant="subtle"
                color="dimmed"
                size="sm"
                title="Regenerate"
              >
                <IconRefresh size={14} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="dimmed"
                size="sm"
                title="Delete"
              >
                <IconTrash size={14} />
              </ActionIcon>
            </>
          )}
        </Group>
      </Group>
    </Box>
  );
}

export function DateDivider({ label }: { label: string }) {
  return (
    <Text size="xs" ta="center" c="dimmed">
      {label}
    </Text>
  );
}
