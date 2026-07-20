import { Badge, Button, EmptyState, Stack } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { Assistant, Preset, Provider } from "@shared/types.ts";

import { presetIcon } from "../../../config/presetIcons.ts";
import { ListItem } from "./ListItem.tsx";
import { SectionHeader } from "./SectionHeader.tsx";

// Icon shown in the empty-state empty-indicator. Hoisted to module scope so the
// component body doesn't allocate it on every render and so the empty state
// can render it as JSX (you can't invoke a forwardRef component as a function).
const EmptyStateIcon = presetIcon("sparkles");

export function PresetSection({
  presets,
  providers,
  assistants,
  mcps,
}: {
  presets: Preset[];
  providers: Provider[];
  assistants: Assistant[];
  mcps: { id: string; name: string }[];
}) {
  const navigate = useNavigate();

  const hasDeps = providers.length > 0 && assistants.length > 0;

  return (
    <Stack gap="xs">
      <SectionHeader
        title="Presets"
        description="Kombinationen aus Modellanbieter, Assistent und MCP-Server, die du auch während einer Unterhaltung wechseln kannst."
      />
      <Stack gap="xs">
        {presets.map((preset) => {
          const PresetIcon = presetIcon(preset.iconId);
          const provider = providers.find((p) =>
            p.models.some((m) => m.id === preset.modelId),
          );
          const model = provider?.models.find((m) => m.id === preset.modelId);
          const assistant = assistants.find((a) => a.id === preset.assistantId);
          const selectedMcps = mcps.filter((m) => preset.mcpIds.includes(m.id));
          const primaryParts = [
            provider?.name,
            model?.name,
            assistant?.name,
          ].filter(Boolean);
          const mcpParts = selectedMcps.map((m) => m.name);

          return (
            <ListItem
              key={preset.id}
              icon={<PresetIcon size={16} />}
              title={preset.name}
              rightSection={
                preset.default ? (
                  <Badge size="xs" variant="default" color="gray">
                    Standard
                  </Badge>
                ) : null
              }
              subtitle={
                primaryParts.length > 0 ? primaryParts.join(" · ") : undefined
              }
              detail={mcpParts.length > 0 ? mcpParts.join(" · ") : undefined}
              onClick={() => navigate(`/settings/presets/${preset.id}`)}
            />
          );
        })}
        {presets.length === 0 ? (
          <EmptyState>
            <EmptyState.Indicator>
              <EmptyStateIcon size={32} />
            </EmptyState.Indicator>
            <EmptyState.Title>Noch keine Presets</EmptyState.Title>
            <EmptyState.Description>
              {hasDeps
                ? "Leg dein erstes Preset an, um zu chatten."
                : "Erst Anbieter und Assistenten anlegen, dann ein Preset."}
            </EmptyState.Description>
            <Button
              variant="transparent"
              color="gray"
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate("/settings/presets/new")}
            >
              Preset hinzufügen
            </Button>
          </EmptyState>
        ) : (
          <Button
            variant="transparent"
            color="gray"
            leftSection={<IconPlus size={16} />}
            justify="flex-start"
            onClick={() => navigate("/settings/presets/new")}
          >
            Preset hinzufügen
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
