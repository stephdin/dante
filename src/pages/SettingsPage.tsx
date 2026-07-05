import {
  Badge,
  Button,
  Container,
  Flex,
  Group,
  Loader,
  Menu,
  Paper,
  Space,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconApi,
  IconBrain,
  IconCheck,
  IconDeviceLaptop,
  IconMoon,
  IconPlug,
  IconPlus,
  IconSun,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import type {
  Assistant,
  McpConnection,
  Preset,
  Provider,
} from "@shared/types.ts";
import { useNavigate } from "react-router-dom";

import { useConfig } from "../api/queries.ts";
import { useDisplaySettings } from "../context/DisplaySettingsContext.tsx";
import { presetIcon } from "../config/presetIcons.ts";

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Stack gap={2}>
      <Text size="md" fw={600}>
        {title}
      </Text>
      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
    </Stack>
  );
}

function ListItem({
  icon,
  title,
  subtitle,
  detail,
  rightSection,
  onClick,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  detail?: string;
  rightSection?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Paper
      p="sm"
      radius="md"
      withBorder
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <Group gap="sm" wrap="nowrap" justify="space-between">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          {icon && (
            <ThemeIcon variant="light" color="gray" size="sm">
              {icon}
            </ThemeIcon>
          )}
          <Stack gap={2} style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
            <Group gap="xs" wrap="nowrap">
              <Text size="sm" fw={500}>
                {title}
              </Text>
            </Group>
            {subtitle && (
              <Text size="xs" c="dimmed" truncate>
                {subtitle}
              </Text>
            )}
            {detail && (
              <Text size="xs" c="dimmed" truncate>
                {detail}
              </Text>
            )}
          </Stack>
        </Group>
        {rightSection}
      </Group>
    </Paper>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Flex justify="space-between" align="flex-start" gap="md">
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm">{label}</Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </Stack>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        {children}
      </div>
    </Flex>
  );
}

function ThemeSection() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { settings, updateSetting } = useDisplaySettings();

  return (
    <Stack gap="xs">
      <SectionHeader title="Darstellung" />
      <SettingRow
        label="Farbschema"
        description="Wähle zwischen hellem, dunklem oder automatischem Erscheinungsbild"
      >
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <Button
              variant="default"
              size="sm"
              leftSection={
                colorScheme === "auto" ? (
                  <IconDeviceLaptop size={16} />
                ) : colorScheme === "dark" ? (
                  <IconMoon size={16} />
                ) : (
                  <IconSun size={16} />
                )
              }
            >
              {colorScheme === "auto"
                ? "Auto"
                : colorScheme === "dark"
                  ? "Dunkel"
                  : "Hell"}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconDeviceLaptop size={16} />}
              rightSection={
                colorScheme === "auto" ? <IconCheck size={14} /> : null
              }
              onClick={() => setColorScheme("auto")}
            >
              Auto
            </Menu.Item>
            <Menu.Item
              leftSection={<IconMoon size={16} />}
              rightSection={
                colorScheme === "dark" ? <IconCheck size={14} /> : null
              }
              onClick={() => setColorScheme("dark")}
            >
              Dunkel
            </Menu.Item>
            <Menu.Item
              leftSection={<IconSun size={16} />}
              rightSection={
                colorScheme === "light" ? <IconCheck size={14} /> : null
              }
              onClick={() => setColorScheme("light")}
            >
              Hell
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </SettingRow>
      <Space h="sm" />
      <SettingRow
        label="Provider-Statistiken"
        description="Zeige Token- und Performance-Statistiken des Modellanbieters unter jeder Nachricht"
      >
        <Switch
          checked={settings.showProviderStats}
          onChange={(e) =>
            updateSetting("showProviderStats", e.currentTarget.checked)
          }
        />
      </SettingRow>
      <Space h="sm" />
      <SettingRow
        label="Zeitstempel"
        description="Zeige einen Zeitstempel unter jeder Nachricht"
      >
        <Switch
          checked={settings.showTimestamps}
          onChange={(e) =>
            updateSetting("showTimestamps", e.currentTarget.checked)
          }
        />
      </SettingRow>
    </Stack>
  );
}

function PresetSection({
  presets,
  providers,
  assistants,
  mcps,
}: {
  presets: Preset[];
  providers: Provider[];
  assistants: Assistant[];
  mcps: McpConnection[];
}) {
  const navigate = useNavigate();

  return (
    <Stack gap="xs">
      <SectionHeader
        title="Presets"
        description="Kombinationen aus Modellanbieter, Assistent und MCP-Server, die du auch während einer Unterhaltung wechseln kannst."
      />
      <Stack gap="xs">
        {presets.map((preset) => {
          const PresetIcon = presetIcon(preset.iconId);
          const provider = providers.find((p) =>
            p.models.some((m) => m.id === preset.modelId),
          );
          const model = provider?.models.find((m) => m.id === preset.modelId);
          const assistant = assistants.find((a) => a.id === preset.assistantId);
          const selectedMcps = mcps.filter((m) => preset.mcpIds.includes(m.id));
          const primaryParts = [
            provider?.name,
            model?.name,
            assistant?.name,
          ].filter(Boolean);
          const mcpParts = selectedMcps.map((m) => m.name);

          return (
            <ListItem
              key={preset.id}
              icon={<PresetIcon size={16} />}
              title={preset.name}
              rightSection={
                preset.default ? (
                  <Badge size="xs" variant="default" color="gray">
                    Standard
                  </Badge>
                ) : null
              }
              subtitle={
                primaryParts.length > 0 ? primaryParts.join(" · ") : undefined
              }
              detail={mcpParts.length > 0 ? mcpParts.join(" · ") : undefined}
              onClick={() => navigate(`/settings/presets/${preset.id}`)}
            />
          );
        })}
        <Button
          variant="transparent"
          color="gray"
          leftSection={<IconPlus size={16} />}
          justify="flex-start"
          onClick={() => navigate("/settings/presets/new")}
        >
          Preset hinzufügen
        </Button>
      </Stack>
    </Stack>
  );
}

function ProviderSection({ providers }: { providers: Provider[] }) {
  const navigate = useNavigate();

  return (
    <Stack gap="xs">
      <SectionHeader
        title="Modellanbieter"
        description="Konfigurierte lokale und gehostete Anbieter und Modelle"
      />
      <Stack gap="xs">
        {providers.map((provider) => (
          <ListItem
            key={provider.id}
            icon={<IconApi size={14} />}
            title={provider.name}
            subtitle={provider.models.map((m) => m.name).join(", ")}
            onClick={() => navigate(`/settings/providers/${provider.id}`)}
          />
        ))}
        <Button
          variant="transparent"
          color="gray"
          leftSection={<IconPlus size={16} />}
          justify="flex-start"
          onClick={() => navigate("/settings/providers/new")}
        >
          Anbieter hinzufügen
        </Button>
      </Stack>
    </Stack>
  );
}

function AssistantSection({ assistants }: { assistants: Assistant[] }) {
  const navigate = useNavigate();

  return (
    <Stack gap="xs">
      <SectionHeader
        title="Assistenten"
        description="Systemanweisungen für den Assistenten"
      />
      <Stack gap="xs">
        {assistants.map((assistant) => (
          <ListItem
            key={assistant.id}
            icon={<IconBrain size={14} />}
            title={assistant.name}
            subtitle={assistant.prompt}
            onClick={() => navigate(`/settings/assistants/${assistant.id}`)}
          />
        ))}
        <Button
          variant="transparent"
          color="gray"
          leftSection={<IconPlus size={16} />}
          justify="flex-start"
          onClick={() => navigate("/settings/assistants/new")}
        >
          Assistent hinzufügen
        </Button>
      </Stack>
    </Stack>
  );
}

function McpSection({ mcps }: { mcps: McpConnection[] }) {
  const navigate = useNavigate();

  return (
    <Stack gap="xs">
      <SectionHeader
        title="MCP Server"
        description="Verwalte MCP-Server zur Integration von externen Diensten und Funktionen"
      />
      <Stack gap="xs">
        {mcps.map((mcp) => (
          <ListItem
            key={mcp.id}
            icon={<IconPlug size={14} />}
            title={mcp.name}
            subtitle={mcp.status}
            onClick={() => navigate(`/settings/mcps/${mcp.id}`)}
          />
        ))}
        <Button
          variant="transparent"
          color="gray"
          leftSection={<IconPlus size={16} />}
          justify="flex-start"
          onClick={() => navigate("/settings/mcps/new")}
        >
          Verbindung hinzufügen
        </Button>
      </Stack>
    </Stack>
  );
}

export default function SettingsPage() {
  const { data: config, loading, error } = useConfig();

  return (
    <Container size="md" p="md" w="100%">
      <Stack gap="sm">
        {error ? (
          <Text size="sm" c="red" ta="center">
            Verbindung zum Server fehlgeschlagen.
          </Text>
        ) : loading ? (
          <Stack align="center">
            <Loader />
          </Stack>
        ) : (
          <>
            <ThemeSection />
            <Space h="xl" />
            <PresetSection
              presets={config?.presets ?? []}
              providers={config?.providers ?? []}
              assistants={config?.assistants ?? []}
              mcps={config?.mcps ?? []}
            />
            <Space h="xl" />
            <ProviderSection providers={config?.providers ?? []} />
            <Space h="xl" />
            <AssistantSection assistants={config?.assistants ?? []} />
            <Space h="xl" />
            <McpSection mcps={config?.mcps ?? []} />
            <Space h={160} />
          </>
        )}
      </Stack>
    </Container>
  );
}
