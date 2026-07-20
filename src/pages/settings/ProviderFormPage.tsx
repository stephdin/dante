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
  Menu,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCheck,
  IconLetterA,
  IconLetterO,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { providerSchema } from "@shared/schemas/config.ts";
import { useSettingsFormContext } from "./hooks.ts";
import { saveConfig } from "../../api/queries.ts";
import type { Config, Provider } from "@shared/types.ts";

const createSchema = providerSchema.omit({ id: true });

export default function ProviderFormPage() {
  const { id, isNew, entity, config, loading, error, notFound } =
    useSettingsFormContext<Provider>("providers");
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const form = useForm({
    initialValues: isNew
      ? {
          id: "",
          name: "",
          url: "",
          models: [] as { id: string; name: string; type: string }[],
        }
      : {
          id: entity?.id ?? "",
          name: entity?.name ?? "",
          url: entity?.url ?? "",
          models: entity?.models ?? [],
        },
    validate: zodResolver(isNew ? createSchema : providerSchema),
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
            Anbieter nicht gefunden.
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
        const provider: Provider = {
          ...createSchema.parse(values),
          id: crypto.randomUUID(),
        } as Provider;
        newConfig.providers.push(provider);
        navigate(`/settings/providers/${provider.id}`);
      } else {
        const provider = providerSchema.parse(values) as Provider;
        const idx = newConfig.providers.findIndex((p: Provider) => p.id === id);
        if (idx >= 0) newConfig.providers[idx] = provider;
      }

      await saveConfig(newConfig);
      if (isNew) navigate("/settings");
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
      newConfig.providers = newConfig.providers.filter(
        (p: Provider) => p.id !== id,
      );
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
              {isNew ? "Anbieter hinzufügen" : "Anbieter bearbeiten"}
            </Title>
          </Group>

          {saveError && (
            <Text size="sm" c="red">
              {saveError}
            </Text>
          )}

          <TextInput
            label="Name"
            placeholder="z.B. OpenCode Go"
            withAsterisk
            {...form.getInputProps("name")}
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
            {form.values.models.map(
              (
                model: { id: string; name: string; type: string },
                index: number,
              ) => (
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
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <Button
                        variant="default"
                        size="sm"
                        px={6}
                        title={
                          model.type === "anthropic"
                            ? "anthropic"
                            : "openai-compatible"
                        }
                        aria-label={model.type}
                      >
                        {model.type === "anthropic" ? (
                          <IconLetterA size={16} />
                        ) : (
                          <IconLetterO size={16} />
                        )}
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconLetterO size={16} />}
                        rightSection={
                          model.type === "openai-compatible" ? (
                            <IconCheck size={14} />
                          ) : null
                        }
                        onClick={() =>
                          form.setFieldValue(
                            `models.${index}.type`,
                            "openai-compatible",
                          )
                        }
                      >
                        openai-compatible
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconLetterA size={16} />}
                        rightSection={
                          model.type === "anthropic" ? (
                            <IconCheck size={14} />
                          ) : null
                        }
                        onClick={() =>
                          form.setFieldValue(
                            `models.${index}.type`,
                            "anthropic",
                          )
                        }
                      >
                        anthropic
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    mt={4}
                    onClick={() => form.removeListItem("models", index)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ),
            )}
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconPlus size={14} />}
              justify="flex-start"
              onClick={() =>
                form.insertListItem("models", {
                  id: "",
                  name: "",
                  type: "openai-compatible",
                })
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
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        title="Anbieter löschen?"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Bist du sicher, dass du diesen Anbieter löschen möchtest? Alle
            zugehörigen Modelle werden ebenfalls gelöscht.
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
