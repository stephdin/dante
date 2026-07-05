import type { ReactNode } from "react";
import { Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";

export function ListItem({
  icon,
  title,
  subtitle,
  detail,
  rightSection,
  onClick,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  detail?: string;
  rightSection?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Paper
      p="sm"
      radius="md"
      withBorder
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <Group gap="sm" wrap="nowrap" justify="space-between">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          {icon && (
            <ThemeIcon variant="light" color="gray" size="sm">
              {icon}
            </ThemeIcon>
          )}
          <Stack gap={2} style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
            <Group gap="xs" wrap="nowrap">
              <Text size="sm" fw={500}>
                {title}
              </Text>
            </Group>
            {subtitle && (
              <Text size="xs" c="dimmed" truncate>
                {subtitle}
              </Text>
            )}
            {detail && (
              <Text size="xs" c="dimmed" truncate>
                {detail}
              </Text>
            )}
          </Stack>
        </Group>
        {rightSection}
      </Group>
    </Paper>
  );
}
