import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";

export default function McpFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === undefined;

  return (
    <Container size="md" p="md" w="100%">
      <Stack gap="lg">
        <Title order={4}>
          {isNew ? "MCP-Verbindung hinzufügen" : "MCP-Verbindung bearbeiten"}
        </Title>
        <Text c="dimmed">
          Hier wird später das Formular für MCP-Verbindungen stehen: Name,
          Transporttyp und Verbindungsdetails.
        </Text>
        <Button onClick={() => navigate("/settings")}>Zurück</Button>
      </Stack>
    </Container>
  );
}
