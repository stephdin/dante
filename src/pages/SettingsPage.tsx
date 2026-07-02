import { useEffect, useState } from "react";
import {
  ActionIcon,
  Button,
  Container,
  Group,
  MultiSelect,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconAdjustments,
  IconApi,
  IconBrain,
  IconDeviceLaptop,
  IconMoon,
  IconPencil,
  IconPlug,
  IconPlus,
  IconServer,
  IconSun,
  IconTrash,
} from "@tabler/icons-react";
import type {
  Assistant,
  McpConnection,
  Preset,
  Provider,
} from "@shared/types.ts";
import { useConfig } from "../api/queries.ts";
import { presetIcon } from "../config/presetIcons.ts";

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Group gap="sm" mt="md">
      <ThemeIcon variant="light" color="gray" size="sm">
        {icon}
      </ThemeIcon>
      <Text size="sm" fw={600}>{title}</Text>
    </Group>
  );
}

export function SettingsPage() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { data: config } = useConfig();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [mcps, setMcps] = useState<McpConnection[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [seeded, setSeeded] = useState(false);

  // Seed the editable state from the backend config once it loads. Edits stay
  // local for now; persisting back to the server is a later phase.
  useEffect(() => {
    if (config && !seeded) {
      setProviders(config.providers);
      setAssistants(config.assistants);
      setMcps(config.mcps);
      setPresets(config.presets);
      setSeeded(true);
    }
  }, [config, seeded]);

  // Select data derived from entities
  const modelSelectData = providers.map((p) => ({
    group: p.name,
    items: p.models.map((m) => ({ value: m.id, label: m.name })),
  }));
  const assistantSelectData = assistants.map((a) => ({ value: a.id, label: a.name }));
  const mcpSelectData = mcps.map((m) => ({ value: m.id, label: m.name }));

  // --- Provider handlers ---
  function addProvider() {
    setProviders((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "Neuer Anbieter",
        type: "OpenAI-kompatibel",
        url: "https://",
        models: [],
      },
    ]);
  }
  function removeProvider(id: string) {
    setProviders((prev) => prev.filter((p) => p.id !== id));
  }
  function addModel(providerId: string) {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === providerId
          ? { ...p, models: [...p.models, { id: crypto.randomUUID(), name: "Neues Modell" }] }
          : p,
      ),
    );
  }
  function removeModel(providerId: string, modelId: string) {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === providerId
          ? { ...p, models: p.models.filter((m) => m.id !== modelId) }
          : p,
      ),
    );
  }

  // --- Assistant handlers ---
  function addAssistant() {
    setAssistants((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "Neuer Assistent", prompt: "Du bist …" },
    ]);
  }
  function removeAssistant(id: string) {
    setAssistants((prev) => prev.filter((a) => a.id !== id));
  }
  function updateAssistantPrompt(id: string, prompt: string) {
    setAssistants((prev) => prev.map((a) => (a.id === id ? { ...a, prompt } : a)));
  }

  // --- MCP handlers ---
  function addMcp() {
    setMcps((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "Neue Verbindung", transport: "stdio", status: "disconnected" },
    ]);
  }
  function removeMcp(id: string) {
    setMcps((prev) => prev.filter((m) => m.id !== id));
  }

  // --- Preset handlers ---
  function addPreset() {
    setPresets((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "Neues Preset",
        iconId: "sparkles",
        modelId: providers[0]?.models[0]?.id ?? "",
        assistantId: assistants[0]?.id ?? "",
        mcpIds: [],
        default: false,
      },
    ]);
  }
  function removePreset(id: string) {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }
  function updatePreset(id: string, patch: Partial<Preset>) {
    setPresets((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function setPresetDefault(id: string, isDefault: boolean) {
    setPresets((prev) =>
      prev.map((p) => {
        if (p.id === id) return { ...p, default: isDefault };
        if (isDefault) return { ...p, default: false };
        return p;
      }),
    );
  }

  return (
    <Container size="md" p="md" w="100%">
      <Stack gap="lg">
        <Title order={3}>Einstellungen</Title>

        {/* Erscheinungsbild */}
        <SectionHeader icon={<IconSun size={16} />} title="Erscheinungsbild" />
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">Farbschema</Text>
          <SegmentedControl
            value={colorScheme}
            onChange={(value) => setColorScheme(value as "auto" | "light" | "dark")}
            data={[
              {
                value: "auto",
                label: (
                  <Group gap={6} wrap="nowrap">
                    <IconDeviceLaptop size={16} />
                    <span>Auto</span>
                  </Group>
                ),
              },
              {
                value: "dark",
                label: (
                  <Group gap={6} wrap="nowrap">
                    <IconMoon size={16} />
                    <span>Dunkel</span>
                  </Group>
                ),
              },
              {
                value: "light",
                label: (
                  <Group gap={6} wrap="nowrap">
                    <IconSun size={16} />
                    <span>Hell</span>
                  </Group>
                ),
              },
            ]}
          />
        </Group>

        {/* Modellanbieter (with nested models) */}
        <SectionHeader icon={<IconServer size={16} />} title="Modellanbieter" />
        <Stack gap="xs">
          {providers.map((p) => (
            <Paper key={p.id} p="sm" radius="md" withBorder>
              <Stack gap="xs">
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <ThemeIcon variant="light" color="gray" size="sm">
                      <IconApi size={14} />
                    </ThemeIcon>
                    <Stack gap={2} style={{ overflow: "hidden" }}>
                      <Text size="sm" fw={500}>{p.name}</Text>
                      <Text size="xs" c="dimmed">{p.type} · {p.url}</Text>
                    </Stack>
                  </Group>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="gray" size="sm" title="Bearbeiten">
                      <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      title="Entfernen"
                      onClick={() => removeProvider(p.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>

                {/* Nested models under this provider */}
                <Stack gap={4} ml="lg">
                  {p.models.map((m) => (
                    <Group key={m.id} justify="space-between" align="center">
                      <Text size="xs" c="dimmed">{m.name}</Text>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="xs"
                        title="Modell entfernen"
                        onClick={() => removeModel(p.id, m.id)}
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Group>
                  ))}
                  <Button
                    variant="subtle"
                    size="xs"
                    color="gray"
                    leftSection={<IconPlus size={12} />}
                    justify="flex-start"
                    onClick={() => addModel(p.id)}
                  >
                    Modell hinzufügen
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
          <Button
            variant="light"
            color="gray"
            leftSection={<IconPlus size={16} />}
            justify="flex-start"
            onClick={addProvider}
          >
            Anbieter hinzufügen
          </Button>
        </Stack>

        {/* Assistent */}
        <SectionHeader icon={<IconBrain size={16} />} title="Assistent" />
        <Stack gap="xs">
          {assistants.map((a) => (
            <Paper key={a.id} p="sm" radius="md" withBorder>
              <Group justify="space-between" align="center" wrap="nowrap" mb="xs">
                <Text size="sm" fw={500}>{a.name}</Text>
                <Group gap="xs">
                  <ActionIcon variant="subtle" color="gray" size="sm" title="Bearbeiten">
                    <IconPencil size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    title="Entfernen"
                    onClick={() => removeAssistant(a.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
              <Textarea
                value={a.prompt}
                onChange={(e) => updateAssistantPrompt(a.id, e.currentTarget.value)}
                autosize
                minRows={2}
                maxRows={5}
                size="xs"
              />
            </Paper>
          ))}
          <Button
            variant="light"
            color="gray"
            leftSection={<IconPlus size={16} />}
            justify="flex-start"
            onClick={addAssistant}
          >
            Assistent hinzufügen
          </Button>
        </Stack>

        {/* MCP-Verbindungen */}
        <SectionHeader icon={<IconPlug size={16} />} title="MCP-Verbindungen" />
        <Stack gap="xs">
          {mcps.map((m) => (
            <Paper key={m.id} p="sm" radius="md" withBorder>
              <Group justify="space-between" align="center" wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <ThemeIcon
                    variant="light"
                    color={m.status === "connected" ? "green" : "gray"}
                    size="sm"
                  >
                    <IconPlug size={14} />
                  </ThemeIcon>
                  <Stack gap={2} style={{ overflow: "hidden" }}>
                    <Text size="sm" fw={500}>{m.name}</Text>
                    <Text size="xs" c="dimmed">
                      {m.transport} · {m.status === "connected" ? "Verbunden" : "Getrennt"}
                    </Text>
                  </Stack>
                </Group>
                <Group gap="xs">
                  <ActionIcon variant="subtle" color="gray" size="sm" title="Bearbeiten">
                    <IconPencil size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    title="Entfernen"
                    onClick={() => removeMcp(m.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          ))}
          <Button
            variant="light"
            color="gray"
            leftSection={<IconPlus size={16} />}
            justify="flex-start"
            onClick={addMcp}
          >
            Verbindung hinzufügen
          </Button>
        </Stack>

        {/* Presets */}
        <SectionHeader icon={<IconAdjustments size={16} />} title="Presets" />
        <Stack gap="xs">
          {presets.map((preset) => {
            const PresetIcon = presetIcon(preset.iconId);
            return (
              <Paper key={preset.id} p="sm" radius="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="xs" wrap="nowrap">
                      <ThemeIcon variant="light" color="gray" size="sm">
                        <PresetIcon size={16} />
                      </ThemeIcon>
                      <Text size="sm" fw={500}>{preset.name}</Text>
                    </Group>
                    <Group gap="xs">
                      <Switch
                        label="Standard"
                        size="xs"
                        checked={preset.default}
                        onChange={(e) => setPresetDefault(preset.id, e.currentTarget.checked)}
                      />
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        title="Entfernen"
                        onClick={() => removePreset(preset.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  <Select
                    label="Modell"
                    size="xs"
                    data={modelSelectData}
                    value={preset.modelId}
                    onChange={(value) => updatePreset(preset.id, { modelId: value ?? "" })}
                  />
                  <Select
                    label="Assistent"
                    size="xs"
                    data={assistantSelectData}
                    value={preset.assistantId}
                    onChange={(value) => updatePreset(preset.id, { assistantId: value ?? "" })}
                  />
                  <MultiSelect
                    label="MCP"
                    size="xs"
                    data={mcpSelectData}
                    value={preset.mcpIds}
                    onChange={(value) => updatePreset(preset.id, { mcpIds: value })}
                    clearable
                  />
                </Stack>
              </Paper>
            );
          })}
          <Button
            variant="light"
            color="gray"
            leftSection={<IconPlus size={16} />}
            justify="flex-start"
            onClick={addPreset}
          >
            Preset hinzufügen
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
