import { Container, Loader, Space, Stack, Text } from "@mantine/core";

import { useConfig } from "../api/queries.ts";
import { AssistantSection } from "./settings/components/AssistantSection.tsx";
import { ConnectionSection } from "./settings/components/ConnectionSection.tsx";
import { PresetSection } from "./settings/components/PresetSection.tsx";
import { ProviderSection } from "./settings/components/ProviderSection.tsx";
import { ThemeSection } from "./settings/components/ThemeSection.tsx";

export default function SettingsPage() {
  const { data: config, loading, error } = useConfig();

  return (
    <Container size="md" p="md" w="100%">
      <Stack gap="sm">
        {/* Local settings — always visible, even if the server is unreachable
            (so the user can fix the API token if it's wrong). */}
        <ThemeSection />
        <Space h="xl" />
        <ConnectionSection />
        <Space h="xl" />

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
