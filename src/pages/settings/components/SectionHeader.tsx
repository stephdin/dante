import { Stack, Text } from "@mantine/core";

export function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Stack gap={2}>
      <Text size="md" fw={600}>
        {title}
      </Text>
      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
    </Stack>
  );
}
