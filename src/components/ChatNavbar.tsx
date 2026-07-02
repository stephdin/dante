import { AppShell, Divider, NavLink, Stack, Text } from "@mantine/core";

export function ChatNavbar() {
  return (
    <AppShell.Navbar p="md">
      <Stack gap="xs">
        <Text size="xs" fw={500} tt="uppercase" c="dimmed">
          Chats
        </Text>
        <NavLink label="How async/await works" active />
        <NavLink label="Trip planning ideas" />
        <NavLink label="Debug CSS gap issue" />

        <Divider my="xs" />

        <Text size="xs" fw={500} tt="uppercase" c="dimmed">
          Settings
        </Text>
        <NavLink label="Preferences" />
        <NavLink label="Sign out" />
      </Stack>
    </AppShell.Navbar>
  );
}
