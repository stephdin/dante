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
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

import { assistantSchema } from "@shared/schemas/config.ts";
import { useSettingsFormContext } from "./hooks.ts";
import {
  createAssistant,
  deleteAssistant,
  updateAssistant,
} from "../../api/config.ts";
import { ApiError } from "../../api/client.ts";
import type { Assistant } from "@shared/types.ts";

const createSchema = assistantSchema.omit({ id: true });

export default function AssistantFormPage() {
  const { id, isNew, entity, loading, error, notFound } =
    useSettingsFormContext<Assistant>("assistants");
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const form = useForm({
    initialValues: isNew
      ? { id: "", name: "", prompt: "" }
      : { id: entity?.id ?? "", name: entity?.name ?? "", prompt: entity?.prompt ?? "" },
    validate: zodResolver(isNew ? createSchema : assistantSchema),
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
          <Text size="sm" c="dimmed">Assistent nicht gefunden.</Text>
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
        const created = await createAssistant(body);
        navigate(`/settings/assistants/${created.id}`);
      } else {
        const body = assistantSchema.parse(values);
        await updateAssistant(id, body);
        navigate("/settings");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setFieldError("name", "Dieser Assistent wird noch von einem Preset verwendet.");
      } else {
        // Generic error — could be an ApiError or a network error.
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
      await deleteAssistant(id);
      navigate("/settings");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDeleteError("Kann nicht gelöscht werden — wird noch in Presets verwendet.");
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
              {isNew ? "Assistent hinzufügen" : "Assistent bearbeiten"}
            </Title>
          </Group>

          <TextInput
            label="Name"
            placeholder="z.B. Technischer Redakteur"
            withAsterisk
            {...form.getInputProps("name")}
          />

          <Textarea
            label="System-Prompt"
            placeholder="Du bist ein hilfreicher Assistent..."
            withAsterisk
            autosize
            minRows={3}
            maxRows={12}
            {...form.getInputProps("prompt")}
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
        onClose={() => { setDeleteOpen(false); setDeleteError(null); }}
        title="Assistent löschen?"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">Bist du sicher, dass du diesen Assistenten löschen möchtest?</Text>
          {deleteError && (
            <Text size="sm" c="red">{deleteError}</Text>
          )}
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
