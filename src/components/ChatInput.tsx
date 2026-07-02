import { useState } from "react";
import {
  ActionIcon,
  Button,
  Container,
  Group,
  Menu,
  Paper,
  Stack,
  Textarea,
} from "@mantine/core";
import {
  IconBolt,
  IconBrain,
  IconCheck,
  IconSparkles,
} from "@tabler/icons-react";

type Model = {
  value: string;
  label: string;
  Icon: typeof IconSparkles;
};

// Each model is paired with a distinct icon; the active model's icon is what
// the ActionIcon displays. Add a new entry here to surface another model.
const MODELS: Model[] = [
  { value: "pro", label: "Dante Pro", Icon: IconSparkles },
  { value: "fast", label: "Dante Fast", Icon: IconBolt },
  { value: "reasoning", label: "Dante Reasoning", Icon: IconBrain },
];

export function ChatInput() {
  const [model, setModel] = useState(MODELS[0]);
  const CurrentIcon = model.Icon;

  return (
    <Container size="md" p={0}>
      <Paper radius="lg" shadow="md" p="md" withBorder>
        <Stack gap="sm">
          <Textarea
            placeholder="Write your prompt here"
            autosize
            minRows={2}
            maxRows={7}
            variant="unstyled"
          />
          <Group justify="space-between" align="center">
            <Menu position="top-start" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  title="Select model"
                >
                  <CurrentIcon size={18} color="grey" />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {MODELS.map(({ value, label, Icon }) => (
                  <Menu.Item
                    key={value}
                    leftSection={<Icon size={16} />}
                    rightSection={
                      value === model.value ? <IconCheck size={14} /> : null
                    }
                    onClick={() => setModel(MODELS.find((m) => m.value === value) ?? model)}
                  >
                    {label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
            <Button color="primary" autoContrast>
              Send
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
