import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import {
  Button,
  Container,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

import { mcpConnectionSchema } from "@shared/schemas/config.ts";
import { useSettingsFormContext } from "./hooks.ts";
import { createMcp, deleteMcp, updateMcp } from "../../api/config.ts";
import { ApiError } from "../../api/client.ts";
import type { McpConnection } from "@shared/types.ts";

const createSchema = mcpConnectionSchema.omit({ id: true, status: true });

export default function McpFormPage() {
  const { id, isNew, entity, loading, error, notFound } =
    useSettingsFormContext<McpConnection>("mcps");
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const form = useForm({
    initialValues: isNew
      ? { id: "", name: "", transport: "stdio", status: "disconnected" as const }
      : {
          id: entity?.id ?? "",
          name: entity?.name ?? "",
          transport: entity?.transport ?? "",
          status: entity?.status ?? ("disconnected" as const),
        },
    validate: zodResolver(isNew ? createSchema : mcpConnectionSchema),
  });

  if (loading) {
    return (
      <Container size="md" p="md" w="100%">
        <Stack align="center"><Loader /></Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="md" p="md" w="100%">
        <Stack align="center">
          <Text size="sm" c="red">Verbindung zum Server fehlgeschlagen.</Text>
          <Button variant="subtle" onClick={() => navigate("/settings")}>
            Zurück zu den Einstellungen
          </Button>
        </Stack>
      </Container>
    );
  }

  if (notFound) {
    return (
      <Container size="md" p="md" w="100%">
        <Stack align="center">
          <Text size="sm" c="dimmed">MCP-Verbindung nicht gefunden.</Text>
          <Button variant="subtle" onClick={() => navigate("/settings")}>
            Zurück zu den Einstellungen
          </Button>
        </Stack>
      </Container>
    );
  }

  const handleSubmit = form.onSubmit(async (values) => {
    setSubmitting(true);
    try {
      if (isNew) {
        const body = createSchema.parse(values);
        const created = await createMcp(body);
        navigate(`/settings/mcps/${created.id}`);
      } else {
        const body = mcpConnectionSchema.parse(values);
        await updateMcp(id, body);
        navigate("/settings");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setFieldError("name", "Diese Verbindung wird noch verwendet.");
      } else {
        form.setFieldError("name", "Speichern fehlgeschlagen. Bitte erneut versuchen.");
      }
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = async () => {
    setSubmitting(true);
    setDeleteError(null);
    try {
      await deleteMcp(id);
      navigate("/settings");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDeleteError("Kann nicht gelöscht werden — wird noch verwendet.");
      } else {
        setDeleteError("Löschen fehlgeschlagen. Bitte erneut versuchen.");
      }
    } finally {
      setSubmitting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <Container size="md" p="md" w="100%">
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          <Group gap="sm">
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconArrowLeft size={14} />}
              onClick={() => navigate("/settings")}
            >
              Zurück
            </Button>
            <Title order={4}>
              {isNew
                ? "MCP-Verbindung hinzufügen"
                : "MCP-Verbindung bearbeiten"}
            </Title>
          </Group>

          <TextInput
            label="Name"
            placeholder="z.B. Filesystem"
            withAsterisk
            {...form.getInputProps("name")}
          />

          <TextInput
            label="Transport-Typ"
            withAsterisk
            {...form.getInputProps("transport")}
          />

          {!isNew && (
            <TextInput
              label="Status"
              value={form.values.status}
              disabled
              description="Der Status wird automatisch vom Server verwaltet."
            />
          )}

          <Group justify="space-between" mt="sm">
            <Group>
              <Button type="submit" loading={submitting}>
                {isNew ? "Anlegen" : "Speichern"}
              </Button>
              <Button
                variant="subtle"
                color="gray"
                onClick={() => navigate("/settings")}
              >
                Abbrechen
              </Button>
            </Group>
            {!isNew && (
              <Button
                variant="subtle"
                color="red"
                onClick={() => setDeleteOpen(true)}
              >
                Löschen
              </Button>
            )}
          </Group>
        </Stack>
      </form>

      <Modal
        opened={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteError(null); }}
        title="MCP-Verbindung löschen?"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Bist du sicher, dass du diese MCP-Verbindung löschen möchtest?
          </Text>
          {deleteError && <Text size="sm" c="red">{deleteError}</Text>}
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => { setDeleteOpen(false); setDeleteError(null); }}
            >
              Abbrechen
            </Button>
            <Button color="red" onClick={handleDelete} loading={submitting}>
              Löschen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
