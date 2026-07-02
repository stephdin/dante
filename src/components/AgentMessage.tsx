import { useState } from "react";
import {
  ActionIcon,
  Box,
  Collapse,
  Group,
  Paper,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronDown,
  IconCopy,
  IconRefresh,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { useMessageActions } from "./useMessageActions.ts";

export function AgentMessage({
  text,
  reasoning,
  last = false,
  starred = false,
}: {
  text: string;
  reasoning?: string;
  last?: boolean;
  starred?: boolean;
}) {
  const { ref, actionsStyle } = useMessageActions();
  const [reasoningOpen, setReasoningOpen] = useState(true);
  const hasReasoning = !!reasoning && reasoning.trim().length > 0;
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
                  transform: reasoningOpen ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 120ms ease",
                }}
              />
              Gedanken
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
        <Text size="md">{text}</Text>
      </Paper>
      <Group justify="flex-start" align="center" gap={4} mt="xs">
        {starred && (
          <ActionIcon variant="subtle" color="yellow" size="sm" title="Markierung entfernen">
            <IconStarFilled size={14} />
          </ActionIcon>
        )}
        <Group gap={4} style={actionsStyle}>
          {!starred && (
            <ActionIcon variant="subtle" color="dimmed" size="sm" title="Markieren">
              <IconStar size={14} />
            </ActionIcon>
          )}
          <ActionIcon variant="subtle" color="dimmed" size="sm" title="Kopieren">
            <IconCopy size={14} />
          </ActionIcon>
          {last && (
            <>
              <ActionIcon
                variant="subtle"
                color="dimmed"
                size="sm"
                title="Neu generieren"
              >
                <IconRefresh size={14} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="dimmed"
                size="sm"
                title="Löschen"
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
