import { Link, useLocation } from "react-router-dom";
import {
  Drawer,
  Loader,
  NavLink,
  Stack,
  Text,
} from "@mantine/core";
import { IconList, IconPlus, IconSettings } from "@tabler/icons-react";

import { useConversations } from "../api/queries.ts";

export function ChatNavbar({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { pathname } = useLocation();
  const { data: conversations, loading, error } = useConversations();

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="left"
      size={280}
      padding="md"
      title="Dante"
      styles={{ body: { padding: 0 } }}
    >
      <Stack gap={0} style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
        <NavLink
          component={Link}
          to="/new"
          onClick={onClose}
          active={pathname === "/new"}
          label="Neuer Chat"
             color="gray"
          leftSection={<IconPlus size={16} />}
        />

        <NavLink
          component={Link}
          to="/chats"
          onClick={onClose}
          active={pathname === "/chats"}
          label="Chat-Übersicht"
          color="gray"
          leftSection={<IconList size={16} />}
        />

        <NavLink
          component={Link}
          to="/settings"
          onClick={onClose}
          active={pathname === "/settings"}
          label="Einstellungen"
          color="gray"
          leftSection={<IconSettings size={16} />}
        />

        <Text
          size="xs"
          fw={500}
          tt="uppercase"
          c="dimmed"
          px="sm"
          mt="md"
          mb="xs"
        >
          Chats
        </Text>
        {error ? (
          <Text size="xs" c="red" px="sm">
            Verbindung zum Server fehlgeschlagen.
          </Text>
        ) : loading ? (
          <Stack align="center" p="sm">
            <Loader size="xs" />
          </Stack>
        ) : conversations?.length === 0 ? (
          <Text size="xs" c="dimmed" px="sm">
            Keine Chats vorhanden. Starte einen neuen Chat.
          </Text>
        ) : (
          conversations?.map((chat) => (
            <NavLink
              key={chat.id}
              component={Link}
              to={`/conversation/${chat.id}`}
              onClick={onClose}
              active={pathname === `/conversation/${chat.id}`}
              label={chat.label}
              color="gray"
            />
          ))
        )}
      </Stack>
    </Drawer>
  );
}
