import { useState, type KeyboardEvent } from "react";
import {
  Button,
  Container,
  Group,
  Menu,
  Paper,
  Stack,
  Textarea,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import { useConfig } from "../api/queries.ts";
import { presetIcon } from "../config/presetIcons.ts";

export function ChatInput({
  onSend,
  onStop,
  busy,
}: {
  onSend?: (text: string, presetId: string | undefined) => void;
  onStop?: () => void;
  busy?: boolean;
}) {
  const { data: config } = useConfig();
  const presets = config?.presets ?? [];
  const [value, setValue] = useState("");
  const [presetId, setPresetId] = useState<string | null>(null);
  // Fall back to the default preset, then to the first available one.
  const preset =
    presets.find((p) => p.id === presetId) ??
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
                      onClick={() => setPresetId(p.id)}
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
