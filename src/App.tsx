import { useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  AppShell,
  Burger,
  Button,
  Group,
  Loader,
  Menu,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  Navigate,
  Route,
  Routes,
  ScrollRestoration,
  useLocation,
} from "react-router-dom";
import {
  IconClipboard,
  IconDatabaseImport,
  IconDotsVertical,
  IconDownload,
  IconFileDownload,
  IconFlame,
  IconPencil,
  IconStar,
} from "@tabler/icons-react";
import { ZodError } from "zod";

import { apiGet, apiPut } from "./api/client.ts";
import { invalidateConfig, useConfig } from "./api/queries.ts";
import { configSchema } from "@shared/schemas/config.ts";
import type { Config } from "@shared/types.ts";
import { ChatNavbar } from "./components/ChatNavbar.tsx";
import AssistantFormPage from "./pages/settings/AssistantFormPage.tsx";
import PresetFormPage from "./pages/settings/PresetFormPage.tsx";
import ProviderFormPage from "./pages/settings/ProviderFormPage.tsx";
import ChatOverviewPage from "./pages/ChatOverviewPage.tsx";
import ConversationPage from "./pages/ConversationPage.tsx";
import NewConversationPage from "./pages/NewConversationPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";

function getPageTitle(pathname: string): string {
  if (pathname === "/new") return "Dante";
  if (pathname === "/chats") return "Chats";
  if (pathname === "/settings") return "Einstellungen";
  if (pathname.startsWith("/settings/")) return "Einstellungen";
  if (pathname.startsWith("/conversation/")) return "";
  return "Dante";
}

function App() {
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure();
  const { pathname } = useLocation();
  // Show the actions menu on conversation and settings pages.
  // Keep its slot reserved (visibility hidden) so the title stays centered.
  const showMenu =
    pathname.startsWith("/conversation/") || pathname.startsWith("/settings");
  const isConv = pathname.startsWith("/conversation/");
  const isSettings = pathname.startsWith("/settings");
  useConfig(); // prime the cache for settings pages

  // ── Export ───────────────────────────────────────────────────────────

  async function handleExportConfig() {
    try {
      const config = await apiGet<Config>("/config");
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dante-config-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Silently ignore — config fetch failed.
    }
  }

  // ── Import ───────────────────────────────────────────────────────────

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState("");
  const [importConfigData, setImportConfigData] = useState<Config | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportConfigData(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        const parsed = configSchema.parse(json);
        const p = parsed.providers.length;
        const a = parsed.assistants.length;
        const m = parsed.mcps.length;
        const pr = parsed.presets.length;
        setImportSummary(
          `${p} Provider, ${a} Assistenten, ${m} MCPs, ${pr} Presets`,
        );
        setImportConfigData(parsed);
      } catch (err) {
        if (err instanceof ZodError) {
          setImportError(
            err.issues
              .map((i) => `• ${i.path.join(".")}: ${i.message}`)
              .join("\n"),
          );
        } else {
          setImportError("Keine gültige JSON-Datei.");
        }
      }
      setImportModalOpen(true);
    };
    reader.readAsText(file);

    // Reset so the same file can be re-selected.
    e.target.value = "";
  }

  async function handleImportConfirm() {
    if (!importConfigData) return;
    setImportLoading(true);
    try {
      await apiPut("/config", importConfigData);
      invalidateConfig();
      setImportModalOpen(false);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Import fehlgeschlagen.",
      );
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <AppShell padding={0} header={{ height: 48 }}>
      <AppShell.Header style={{ borderBottom: 0 }}>
        <Group h="100%" px="md" justify="space-between">
          <Burger opened={navOpened} onClick={toggleNav} size="sm" />

          <Title order={4}>{getPageTitle(pathname)}</Title>

          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="md"
                style={{ visibility: showMenu ? undefined : "hidden" }}
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {isConv ? (
                <>
                  <Menu.Item leftSection={<IconPencil size={14} />}>
                    Unterhaltung umbenennen
                  </Menu.Item>
                  <Menu.Item leftSection={<IconClipboard size={14} />}>
                    Unterhaltung kopieren
                  </Menu.Item>
                  <Menu.Item leftSection={<IconStar size={14} />}>
                    Markierte Nachrichten anzeigen
                  </Menu.Item>
                  <Menu.Item leftSection={<IconDownload size={14} />}>
                    Exportieren
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item leftSection={<IconFlame size={14} />} color="red">
                    Chat löschen
                  </Menu.Item>
                </>
              ) : isSettings ? (
                <>
                  <Menu.Item
                    leftSection={<IconDatabaseImport size={14} />}
                    onClick={handleImportClick}
                  >
                    Konfiguration importieren
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconFileDownload size={14} />}
                    onClick={handleExportConfig}
                  >
                    Konfiguration exportieren
                  </Menu.Item>
                </>
              ) : null}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <ChatNavbar opened={navOpened} onClose={closeNav} />

      <AppShell.Main style={{ display: "flex", flexDirection: "column" }}>
        <ScrollRestoration />
        <Routes>
          <Route path="/" element={<Navigate to="/new" replace />} />
          <Route path="/new" element={<NewConversationPage />} />
          <Route path="/chats" element={<ChatOverviewPage />} />
          <Route path="/conversation/:id" element={<ConversationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/settings/providers/new"
            element={<ProviderFormPage />}
          />
          <Route
            path="/settings/providers/:id"
            element={<ProviderFormPage />}
          />
          <Route
            path="/settings/assistants/new"
            element={<AssistantFormPage />}
          />
          <Route
            path="/settings/assistants/:id"
            element={<AssistantFormPage />}
          />
          <Route path="/settings/presets/new" element={<PresetFormPage />} />
          <Route path="/settings/presets/:id" element={<PresetFormPage />} />
          <Route path="*" element={<Navigate to="/new" replace />} />
        </Routes>
      </AppShell.Main>

      {/* Hidden file input for configuration import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <Modal
        opened={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Konfiguration importieren"
        size="lg"
      >
        <Stack gap="md">
          {importLoading ? (
            <Stack align="center" py="md">
              <Loader />
              <Text size="sm" c="dimmed">
                Konfiguration wird importiert…
              </Text>
            </Stack>
          ) : importError ? (
            <>
              <Alert color="red" title="Ungültige Konfiguration">
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {importError}
                </Text>
              </Alert>
              <Group justify="flex-end">
                <Button
                  variant="default"
                  onClick={() => setImportModalOpen(false)}
                >
                  Abbrechen
                </Button>
              </Group>
            </>
          ) : importConfigData ? (
            <>
              <Text size="sm">Die importierte Konfiguration enthält:</Text>
              <Text size="sm" fw={500}>
                {importSummary}
              </Text>
              <Alert color="yellow" title="Achtung">
                Die gesamte aktuelle Konfiguration wird überschrieben. Dieser
                Vorgang kann nicht rückgängig gemacht werden.
              </Alert>
              <Group justify="flex-end">
                <Button
                  variant="default"
                  onClick={() => setImportModalOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button color="red" onClick={handleImportConfirm}>
                  Importieren
                </Button>
              </Group>
            </>
          ) : null}
        </Stack>
      </Modal>
    </AppShell>
  );
}

export default App;
