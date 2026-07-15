import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import {
  Button,
  Container,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Select,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

import { presetSchema } from "@shared/schemas/config.ts";
import { PRESET_ICONS, presetIcon } from "../../config/presetIcons.ts";
import { useSettingsFormContext } from "./hooks.ts";
import { saveConfig } from "../../api/queries.ts";
import type { Config, Preset } from "../../shared/types.ts";

const createSchema = presetSchema.omit({ id: true });

const ICON_OPTIONS = Object.keys(PRESET_ICONS).map((value) => ({
  value,
  label: value,
}));

export default function PresetFormPage() {
  const { id, isNew, entity, config, loading, error, notFound } =
    useSettingsFormContext<Preset>("presets");
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const modelOptions = useMemo(() => {
    if (!config) return [];
    return config.providers
      .filter((p) => p.models.length > 0)
      .map((p) => ({
        group: p.name,
        items: p.models.map((m) => ({ value: m.id, label: m.name })),
      }));
  }, [config]);

  const assistantOptions = useMemo(() => {
    return (
      config?.assistants.map((a) => ({ value: a.id, label: a.name })) ?? []
    );
  }, [config]);

  const mcpOptions = useMemo(() => {
    return config?.mcps.map((m) => ({ value: m.id, label: m.name })) ?? [];
  }, [config]);

  const form = useForm({
    initialValues: isNew
      ? {
          id: "",
          name: "",
          iconId: "sparkles",
          modelId: "",
          assistantId: "",
          mcpIds: [] as string[],
          default: false,
        }
      : {
          id: entity?.id ?? "",
          name: entity?.name ?? "",
          iconId: entity?.iconId ?? "sparkles",
          modelId: entity?.modelId ?? "",
          assistantId: entity?.assistantId ?? "",
          mcpIds: entity?.mcpIds ?? [],
          default: entity?.default ?? false,
        },
    validate: zodResolver(isNew ? createSchema : presetSchema),
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
            Preset nicht gefunden.
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
        const preset: Preset = {
          ...createSchema.parse(values),
          id: crypto.randomUUID(),
        } as Preset;
        newConfig.presets.push(preset);
      } else {
        const preset = presetSchema.parse(values) as Preset;
        const idx = newConfig.presets.findIndex((p) => p.id === id);
        if (idx >= 0) newConfig.presets[idx] = preset;
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
      newConfig.presets = newConfig.presets.filter((p) => p.id !== id);
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
              {isNew ? "Preset hinzufügen" : "Preset bearbeiten"}
            </Title>
          </Group>

          {saveError && (
            <Text size="sm" c="red">
              {saveError}
            </Text>
          )}

          <TextInput
            label="Name"
            placeholder="z.B. Schnelles Modell"
            withAsterisk
            {...form.getInputProps("name")}
          />

          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Icon
            </Text>
            <SegmentedControl
              data={ICON_OPTIONS.map((opt) => {
                const Icon = presetIcon(opt.value);
                return {
                  value: opt.value,
                  label: <Icon size={18} style={{ display: "block" }} />,
                };
              })}
              {...form.getInputProps("iconId")}
            />
          </Stack>

          <Select
            label="Modell"
            placeholder={
              modelOptions.length === 0
                ? "Erst einen Anbieter anlegen"
                : "Modell auswählen"
            }
            withAsterisk
            disabled={modelOptions.length === 0}
            data={modelOptions}
            searchable
            {...form.getInputProps("modelId")}
          />
          {modelOptions.length === 0 && (
            <Text size="xs" c="dimmed" mt={-12}>
              Lege zuerst einen Modellanbieter an, um ein Modell auswählen zu
              können.
            </Text>
          )}

          <Select
            label="Assistent"
            placeholder={
              assistantOptions.length === 0
                ? "Erst einen Assistenten anlegen"
                : "Assistent auswählen"
            }
            withAsterisk
            disabled={assistantOptions.length === 0}
            data={assistantOptions}
            searchable
            {...form.getInputProps("assistantId")}
          />
          {assistantOptions.length === 0 && (
            <Text size="xs" c="dimmed" mt={-12}>
              Lege zuerst einen Assistenten an, um ihn auswählen zu können.
            </Text>
          )}

          <MultiSelect
            label="MCP Server"
            placeholder={
              mcpOptions.length === 0
                ? "Keine MCP-Verbindungen verfügbar"
                : "MCP-Verbindungen auswählen"
            }
            data={mcpOptions}
            searchable
            {...form.getInputProps("mcpIds")}
          />

          <Switch
            label="Als Standard-Preset verwenden"
            {...form.getInputProps("default", { type: "checkbox" })}
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
        title="Preset löschen?"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Bist du sicher, dass du dieses Preset löschen möchtest?
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
