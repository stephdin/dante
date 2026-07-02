import { Text } from "@mantine/core";

export function DateDivider({ label }: { label: string }) {
  return (
    <Text size="xs" ta="center" c="dimmed">
      {label}
    </Text>
  );
}
