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

import { mcpObjectSchema } from "@shared/schemas/config.ts";
import { useSettingsFormContext } from "./hooks.ts";
import { saveConfig } from "../../api/queries.ts";
import type { Config, Mcp } from "@shared/types.ts";

const createSchema = mcpObjectSchema.omit({ id: true });

export default function McpFormPage() {
  const { id, isNew, entity, config, loading, error, notFound } =
    useSettingsFormContext<Mcp>("mcps");
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const form = useForm({
    initialValues: isNew
      ? { id: "", name: "", transport: "stdio" as const }
      : {
          id: entity?.id ?? "",
          name: entity?.name ?? "",
          transport: entity?.transport ?? ("stdio" as const),
        },
    validate: zodResolver(isNew ? createSchema : mcpObjectSchema),
  });

  if (loading) {
    return (
      <Container size="md" p="md" w="100%">
        <Stack align="center">
          <Loader />
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="md" p="md" w="100%">
        <Stack align="center">
          <Text size="sm" c="red">
            Verbindung zum Server fehlgeschlagen.
          </Text>
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
          <Text size="sm" c="dimmed">
            MCP-Verbindung nicht gefunden.
          </Text>
          <Button variant="subtle" onClick={() => navigate("/settings")}>
            Zurück zu den Einstellungen
          </Button>
        </Stack>
      </Container>
    );
  }

  const handleSubmit = form.onSubmit(async (values) => {
    setSubmitting(true);
    setSaveError(null);
    try {
      const newConfig: Config = structuredClone(config!);

      if (isNew) {
        const mcp: Mcp = {
          ...createSchema.parse(values),
          id: crypto.randomUUID(),
        } as Mcp;
        newConfig.mcps.push(mcp);
      } else {
        const mcp = mcpObjectSchema.parse(values) as Mcp;
        const idx = newConfig.mcps.findIndex((m: Mcp) => m.id === id);
        if (idx >= 0) newConfig.mcps[idx] = mcp;
      }

      await saveConfig(newConfig);
      navigate("/settings");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Speichern fehlgeschlagen.",
      );
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = async () => {
    setSubmitting(true);
    setDeleteError(null);
    try {
      const newConfig: Config = structuredClone(config!);
      newConfig.mcps = newConfig.mcps.filter((m: Mcp) => m.id !== id);
      await saveConfig(newConfig);
      navigate("/settings");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Löschen fehlgeschlagen.",
      );
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

          {saveError && (
            <Text size="sm" c="red">
              {saveError}
            </Text>
          )}

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
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        title="MCP-Verbindung löschen?"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Bist du sicher, dass du diese MCP-Verbindung löschen möchtest?
          </Text>
          {deleteError && (
            <Text size="sm" c="red">
              {deleteError}
            </Text>
          )}
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteError(null);
              }}
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
