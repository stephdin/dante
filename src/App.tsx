import {
  ActionIcon,
  AppShell,
  Burger,
  Group,
  Menu,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  IconClipboard,
  IconDotsVertical,
  IconDownload,
  IconFlame,
  IconPencil,
  IconStar,
} from "@tabler/icons-react";

import { ChatNavbar } from "./components/ChatNavbar.tsx";
import { ChatOverviewPage } from "./pages/ChatOverviewPage.tsx";
import { ConversationPage } from "./pages/ConversationPage.tsx";
import { NewConversationPage } from "./pages/NewConversationPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";

function getPageTitle(pathname: string): string {
  if (pathname === "/new") return "Dante";
  if (pathname === "/chats") return "Chats";
  if (pathname === "/settings") return "Einstellungen";
  if (pathname.startsWith("/conversation/")) return "";
  return "Dante";
}

function App() {
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure();
  const { pathname } = useLocation();
  // The conversation actions menu only makes sense on an open conversation.
  // Keep its slot reserved (visibility hidden) so the title stays centered.
  const showConvMenu = pathname.startsWith("/conversation/");

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
                style={{ visibility: showConvMenu ? undefined : "hidden" }}
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
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
              <Menu.Item
                leftSection={<IconFlame size={14} />}
                color="red"
              >
                Chat löschen
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <ChatNavbar opened={navOpened} onClose={closeNav} />

      <AppShell.Main style={{ display: "flex", flexDirection: "column" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/new" replace />} />
          <Route path="/new" element={<NewConversationPage />} />
          <Route path="/chats" element={<ChatOverviewPage />} />
          <Route path="/conversation/:id" element={<ConversationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/new" replace />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
