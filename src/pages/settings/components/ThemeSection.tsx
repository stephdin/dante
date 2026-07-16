import {
  Button,
  Menu,
  Space,
  Stack,
  Switch,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconCheck,
  IconDeviceLaptop,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";

import { useDisplaySettings } from "../../../context/DisplaySettingsContext.tsx";
import { SectionHeader } from "./SectionHeader.tsx";
import { SettingRow } from "./SettingRow.tsx";

export function ThemeSection() {
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
      <Space h="sm" />
      <SettingRow
        label="Reasoning aufklappen"
        description="Zeige den Reasoning-Block in Antworten standardmäßig geöffnet"
      >
        <Switch
          checked={settings.expandReasoningByDefault}
          onChange={(e) =>
            updateSetting("expandReasoningByDefault", e.currentTarget.checked)
          }
        />
      </SettingRow>
    </Stack>
  );
}
