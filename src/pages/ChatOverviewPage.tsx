import { Link } from "react-router-dom";
import {
  Anchor,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
} from "@mantine/core";

import { useConversations } from "../api/queries.ts";
import { formatRelativeDate } from "../utils/formatDate.ts";

export function ChatOverviewPage() {
  const { data: conversations, loading, error } = useConversations();

  return (
    <Container size="md" p="md" w="100%">
      <Stack gap="lg">
        {error ? (
          <Text size="sm" c="red" ta="center">
            Verbindung zum Server fehlgeschlagen.
          </Text>
        ) : loading ? (
          <Stack align="center">
            <Loader />
          </Stack>
        ) : conversations?.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center">
            Keine Chats vorhanden. Starte einen neuen Chat.
          </Text>
        ) : (
          <Stack gap="sm">
            {conversations?.map((chat) => (
              <Anchor
                key={chat.id}
                component={Link}
                to={`/conversation/${chat.id}`}
                underline="never"
                c="inherit"
              >
                <Paper p="sm" radius="md" withBorder>
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={2} style={{ overflow: "hidden" }}>
                      <Text size="sm" fw={500}>
                        {chat.label}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {chat.preview}
                      </Text>
                    </Stack>
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                      {formatRelativeDate(chat.updatedAt)}
                    </Text>
                  </Group>
                </Paper>
              </Anchor>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
