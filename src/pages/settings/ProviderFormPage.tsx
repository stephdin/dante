import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import {
  ActionIcon,
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
import { IconArrowLeft, IconPlus, IconTrash } from "@tabler/icons-react";

import { providerSchema } from "@shared/schemas/config.ts";
import { useSettingsFormContext } from "./hooks.ts";
import {
  createProvider,
  deleteProvider,
  updateProvider,
} from "../../api/config.ts";
import { ApiError } from "../../api/client.ts";
import type { Provider } from "@shared/types.ts";

const createSchema = providerSchema.omit({ id: true });

export default function ProviderFormPage() {
  const { id, isNew, entity, loading, error, notFound } =
    useSettingsFormContext<Provider>("providers");
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const form = useForm({
    initialValues: isNew
      ? { id: "", name: "", type: "", url: "", models: [] as { id: string; name: string }[] }
      : {
          id: entity?.id ?? "",
          name: entity?.name ?? "",
          type: entity?.type ?? "",
          url: entity?.url ?? "",
          models: entity?.models ?? [],
        },
    validate: zodResolver(isNew ? createSchema : providerSchema),
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
          <Text size="sm" c="dimmed">Anbieter nicht gefunden.</Text>
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
        const created = await createProvider(body);
        navigate(`/settings/providers/${created.id}`);
      } else {
        const body = providerSchema.parse(values);
        await updateProvider(id, body);
        navigate("/settings");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setFieldError(
          "name",
          "Dieser Anbieter kann nicht gelöscht werden — Modelle werden noch von Presets verwendet.",
        );
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
      await deleteProvider(id);
      navigate("/settings");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDeleteError(
          "Kann nicht gelöscht werden — ein Preset verwendet noch ein Modell dieses Anbieters.",
        );
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
              {isNew ? "Anbieter hinzufügen" : "Anbieter bearbeiten"}
            </Title>
          </Group>

          <TextInput
            label="Name"
            placeholder="z.B. OpenCode Go"
            withAsterisk
            {...form.getInputProps("name")}
          />

          <TextInput
            label="Typ"
            placeholder='z.B. "OpenAI-kompatibel" oder "Lokal"'
            withAsterisk
            {...form.getInputProps("type")}
          />

          <TextInput
            label="URL"
            placeholder="https://api.example.com/v1"
            withAsterisk
            {...form.getInputProps("url")}
          />

          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Modelle
            </Text>
            {form.values.models.length === 0 && (
              <Text size="xs" c="dimmed">
                Noch keine Modelle definiert.
              </Text>
            )}
            {form.values.models.map((_model, index) => (
              <Group key={index} gap="xs" align="flex-start">
                <TextInput
                  placeholder="Modell-ID (z.B. glm-5.2)"
                  style={{ flex: 1 }}
                  withAsterisk
                  {...form.getInputProps(`models.${index}.id`)}
                />
                <TextInput
                  placeholder="Anzeigename"
                  style={{ flex: 1 }}
                  withAsterisk
                  {...form.getInputProps(`models.${index}.name`)}
                />
                <ActionIcon
                  color="red"
                  variant="subtle"
                  mt={4}
                  onClick={() => form.removeListItem("models", index)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ))}
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconPlus size={14} />}
              justify="flex-start"
              onClick={() =>
                form.insertListItem("models", { id: "", name: "" })
              }
            >
              Modell hinzufügen
            </Button>
          </Stack>

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
        title="Anbieter löschen?"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Bist du sicher, dass du diesen Anbieter löschen möchtest? Alle
            zugehörigen Modelle werden ebenfalls gelöscht.
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
