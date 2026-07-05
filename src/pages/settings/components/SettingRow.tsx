import type { ReactNode } from "react";
import { Flex, Stack, Text } from "@mantine/core";

export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Flex justify="space-between" align="flex-start" gap="md">
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm">{label}</Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </Stack>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        {children}
      </div>
    </Flex>
  );
}
