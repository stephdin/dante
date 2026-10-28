import { useState, type KeyboardEvent } from "react";
import {
  Button,
  Container,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import { IconCheck, IconSparkles } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { useConfig } from "../api/queries.ts";
import { presetIcon } from "../config/presetIcons.ts";

export function ChatInput({
  onSend,
  onStop,
  busy,
  defaultPresetId,
}: {
  onSend?: (text: string, presetId: string | undefined) => void;
  onStop?: () => void;
  busy?: boolean;
  // Preset to pre-select when the input mounts. The parent (conversation page)
  // passes the most-recently-used presetId for the conversation, so refreshing
  // the page keeps the user's selection. null/undefined → fall back to the
  // config default, then the first available preset (existing behaviour).
  defaultPresetId?: string | null;
}) {
  const { data: config } = useConfig();
  const presets = config?.presets ?? [];
  const hasProviders = (config?.providers.length ?? 0) > 0;
  const hasAssistants = (config?.assistants.length ?? 0) > 0;
  const [value, setValue] = useState("");
  // Local override of the preset selection. null = no manual choice, so we
  // fall through to defaultPresetId (the last-used preset, supplied by the
  // parent) and then the config default. Splitting override from derived
  // default means no effect is needed to sync them: when defaultPresetId
  // arrives after the messages fetch, the displayed preset just updates on
  // re-render, and a manual pick is never clobbered by the re-asserting prop.
  const [overridePresetId, setOverridePresetId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Show a nudge when no presets exist — the app can't chat without them.
  if (presets.length === 0) {
    return (
      <Container size="md" p={0}>
        <Paper radius="lg" shadow="md" p="md" withBorder>
          <Stack align="center" gap="md">
            <ThemeIcon variant="transparent" color="gray" size="lg">
              <IconSparkles size={24} />
            </ThemeIcon>
            <Stack gap={4} align="center">
              <Text size="sm" fw={500}>
                Noch kein Preset konfiguriert
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                {!hasProviders || !hasAssistants
                  ? "Erst Anbieter und Assistenten anlegen, dann ein Preset."
                  : "Leg ein Preset an, um zu chatten."}
              </Text>
            </Stack>
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => navigate("/settings/presets/new")}
            >
              Preset anlegen
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Manual pick > last-used preset from parent > config default > first.
  const preset =
    presets.find((p) => p.id === overridePresetId) ??
    presets.find((p) => p.id === defaultPresetId) ??
    presets.find((p) => p.default) ??
    presets[0];
  const CurrentIcon = preset
    ? presetIcon(preset.iconId)
    : presetIcon("sparkles");

  function submit() {
    const text = value.trim();
    if (!text || busy) return;
    onSend?.(text, preset?.id);
    setValue("");
  }

  // Enter sends; Shift+Enter inserts a newline.
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <Container size="md" p={0}>
      <Paper radius="lg" shadow="md" p="md" withBorder>
        <Stack gap="sm">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Schreibe eine Nachricht..."
            autosize
            minRows={1}
            maxRows={7}
            variant="unstyled"
          />
          <Group justify="space-between" align="center">
            <Menu position="top-start" withinPortal>
              <Menu.Target>
                <Button
                  variant="transparent"
                  color="gray"
                  size="sm"
                  c="dimmed"
                  px={0}
                  leftSection={<CurrentIcon size={16} />}
                >
                  {preset?.name ?? "Preset"}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {presets.map((p) => {
                  const ItemIcon = presetIcon(p.iconId);
                  return (
                    <Menu.Item
                      key={p.id}
                      leftSection={<ItemIcon size={16} />}
                      rightSection={
                        p.id === preset?.id ? <IconCheck size={14} /> : null
                      }
                      onClick={() => setOverridePresetId(p.id)}
                    >
                      {p.name}
                    </Menu.Item>
                  );
                })}
              </Menu.Dropdown>
            </Menu>
            {busy && onStop ? (
              <Button
                color="primary"
                autoContrast
                variant="light"
                onClick={onStop}
              >
                Stopp
              </Button>
            ) : (
              <Button
                color="primary"
                autoContrast
                onClick={submit}
                disabled={busy || !value.trim()}
              >
                Senden
              </Button>
            )}
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
