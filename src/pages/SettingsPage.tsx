import { Container, Loader, Space, Stack, Text } from "@mantine/core";

import { useConfig } from "../api/queries.ts";
import { AssistantSection } from "./settings/components/AssistantSection.tsx";
import { PresetSection } from "./settings/components/PresetSection.tsx";
import { ProviderSection } from "./settings/components/ProviderSection.tsx";
import { ThemeSection } from "./settings/components/ThemeSection.tsx";

export default function SettingsPage() {
  const { data: config, loading, error } = useConfig();

  return (
    <Container size="md" p="md" w="100%">
      <Stack gap="sm">
        {error ? (
          <Text size="sm" c="red" ta="center">
            Verbindung zum Server fehlgeschlagen.
          </Text>
        ) : loading ? (
          <Stack align="center">
            <Loader />
          </Stack>
        ) : (
          <>
            <ThemeSection />
            <Space h="xl" />
            <PresetSection
              presets={config?.presets ?? []}
              providers={config?.providers ?? []}
              assistants={config?.assistants ?? []}
              mcps={config?.mcps ?? []}
            />
            <Space h="xl" />
            <ProviderSection providers={config?.providers ?? []} />
            <Space h="xl" />
            <AssistantSection assistants={config?.assistants ?? []} />
            <Space h={160} />
          </>
        )}
      </Stack>
    </Container>
  );
}
