import { Button, EmptyState, Stack } from "@mantine/core";
import { IconApi, IconPlus } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { Provider } from "@shared/types.ts";

import { ListItem } from "./ListItem.tsx";
import { SectionHeader } from "./SectionHeader.tsx";

export function ProviderSection({ providers }: { providers: Provider[] }) {
  const navigate = useNavigate();

  return (
    <Stack gap="xs">
      <SectionHeader
        title="Modellanbieter"
        description="Konfigurierte lokale und gehostete Anbieter und Modelle"
      />
      <Stack gap="xs">
        {providers.map((provider) => (
          <ListItem
            key={provider.id}
            icon={<IconApi size={14} />}
            title={provider.name}
            subtitle={provider.models.map((m) => m.name).join(", ")}
            onClick={() => navigate(`/settings/providers/${provider.id}`)}
          />
        ))}
        {providers.length === 0 ? (
          <EmptyState>
            <EmptyState.Indicator>
              <IconApi />
            </EmptyState.Indicator>
            <EmptyState.Title>Noch keine Anbieter</EmptyState.Title>
            <EmptyState.Description>
              Lege einen Modellanbieter an, um Modelle für deine Presets
              nutzbar zu machen.
            </EmptyState.Description>
            <Button
              variant="transparent"
              color="gray"
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate("/settings/providers/new")}
            >
              Anbieter hinzufügen
            </Button>
          </EmptyState>
        ) : (
          <Button
            variant="transparent"
            color="gray"
            leftSection={<IconPlus size={16} />}
            justify="flex-start"
            onClick={() => navigate("/settings/providers/new")}
          >
            Anbieter hinzufügen
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
