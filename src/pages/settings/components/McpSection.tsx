import { Button, Stack } from "@mantine/core";
import { IconPlug, IconPlus } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { McpConnection } from "@shared/types.ts";

import { ListItem } from "./ListItem.tsx";
import { SectionHeader } from "./SectionHeader.tsx";

export function McpSection({ mcps }: { mcps: McpConnection[] }) {
  const navigate = useNavigate();

  return (
    <Stack gap="xs">
      <SectionHeader
        title="MCP Server"
        description="Verwalte MCP-Server zur Integration von externen Diensten und Funktionen"
      />
      <Stack gap="xs">
        {mcps.map((mcp) => (
          <ListItem
            key={mcp.id}
            icon={<IconPlug size={14} />}
            title={mcp.name}
            subtitle={mcp.status}
            onClick={() => navigate(`/settings/mcps/${mcp.id}`)}
          />
        ))}
        <Button
          variant="transparent"
          color="gray"
          leftSection={<IconPlus size={16} />}
          justify="flex-start"
          onClick={() => navigate("/settings/mcps/new")}
        >
          Verbindung hinzufügen
        </Button>
      </Stack>
    </Stack>
  );
}
