import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";

export default function AssistantFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === undefined;

  return (
    <Container size="md" p="md" w="100%">
      <Stack gap="lg">
        <Title order={4}>
          {isNew ? "Assistent hinzufügen" : "Assistent bearbeiten"}
        </Title>
        <Text c="dimmed">
          Hier wird später das Formular für Assistenten stehen: Name und
          System-Prompt.
        </Text>
        <Button onClick={() => navigate("/settings")}>Zurück</Button>
      </Stack>
    </Container>
  );
}
