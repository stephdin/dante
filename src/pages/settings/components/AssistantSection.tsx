import { Button, Stack } from "@mantine/core";
import { IconBrain, IconPlus } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { Assistant } from "@shared/types.ts";

import { ListItem } from "./ListItem.tsx";
import { SectionHeader } from "./SectionHeader.tsx";

export function AssistantSection({ assistants }: { assistants: Assistant[] }) {
  const navigate = useNavigate();

  return (
    <Stack gap="xs">
      <SectionHeader
        title="Assistenten"
        description="Systemanweisungen für den Assistenten"
      />
      <Stack gap="xs">
        {assistants.map((assistant) => (
          <ListItem
            key={assistant.id}
            icon={<IconBrain size={14} />}
            title={assistant.name}
            subtitle={assistant.prompt}
            onClick={() => navigate(`/settings/assistants/${assistant.id}`)}
          />
        ))}
        <Button
          variant="transparent"
          color="gray"
          leftSection={<IconPlus size={16} />}
          justify="flex-start"
          onClick={() => navigate("/settings/assistants/new")}
        >
          Assistent hinzufügen
        </Button>
      </Stack>
    </Stack>
  );
}
