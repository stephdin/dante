import {
  ActionIcon,
  AppShell,
  Box,
  Burger,
  Container,
  Group,
  Menu,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useRef } from "react";
import {
  IconClipboard,
  IconDotsVertical,
  IconDownload,
  IconPencil,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";

import { AgentMessage, DateDivider, UserMessage } from "./components/Message.tsx";
import { ChatInput } from "./components/ChatInput.tsx";
import { ChatNavbar } from "./components/ChatNavbar.tsx";

function App() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Anchor the message list to the bottom so the latest message stays visible
  // above the composer. Re-run this effect when messages become dynamic.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight });
    }
  }, []);

  return (
    <AppShell
      padding={0}
      header={{ height: 48 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
            />
            <Burger
              opened={desktopOpened}
              onClick={toggleDesktop}
              visibleFrom="sm"
              size="sm"
            />
          </Group>

          <Title order={4}>Dante</Title>

          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="md"
                style={{ visibility: mobileOpened ? "hidden" : undefined }}
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPencil size={14} />}>
                Rename conversation
              </Menu.Item>
              <Menu.Item leftSection={<IconClipboard size={14} />}>
                Copy conversation
              </Menu.Item>
              <Menu.Item leftSection={<IconStar size={14} />}>
                Show starred messages
              </Menu.Item>
              <Menu.Item leftSection={<IconDownload size={14} />}>
                Export
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconTrash size={14} />}
                color="red"
              >
                Delete chat
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <ChatNavbar />

      <AppShell.Main
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <Box
          ref={scrollRef}
          style={{
            flex: "1 1 0",
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            // Reserve room at the bottom so the last messages can scroll past
            // the floating composer instead of being hidden behind it.
            paddingBottom: 160,
          }}
        >
          <Container size="md" p="md">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--mantine-spacing-xl)" }}>
              <AgentMessage text="Hi! I'm Dante, your coding agent. Ask me anything about TypeScript, React, or your project." />
              <UserMessage text="Can you explain how async / await works in TypeScript?" />
              <AgentMessage text="Sure! `async` marks a function as always returning a Promise, while `await` pauses execution inside an `async` function until that Promise settles. It lets you write asynchronous code that reads top-to-bottom like synchronous code." />
              <DateDivider label="Jun 28" />
              <UserMessage text="Nice. And how does error handling work with it?" />
              <AgentMessage
                starred
                text={"You wrap the awaited call in a try / catch block. If the Promise rejects, the rejection becomes a thrown error you can catch locally. To avoid swallowing errors, rethrow or surface them to the caller.\n\nExample:\ntry {\n  const data = await fetch('/api');\n} catch (err) {\n  console.error('Request failed', err);\n  throw err;\n}"}
              />
              <UserMessage text="What about running promises in parallel?" />
              <AgentMessage
                text={"Use Promise.all to kick off independent promises together and await them as a group. It resolves once all succeed, or rejects on the first failure.\n\nconst [a, b] = await Promise.all([fetchUser(), fetchPosts()]);"}
              />
              <UserMessage text="Got it. One last thing — when should I use top-level await?" />
              <AgentMessage text="Top-level await only works in ES modules, and it blocks module evaluation until the promise resolves. It's handy for app startup config or initializing a module from an async source, but overusing it slows down cold loads. Use sparingly." />
              <DateDivider label="Yesterday" />
              <UserMessage text="Coming back to this — does Promise.all short-circuit on the first rejection?" />
              <AgentMessage
                last
                text="Yes. Promise.all rejects as soon as one promise rejects, but the other promises keep running (they aren't cancelled). If you want to wait for all of them regardless of failures, use Promise.allSettled instead."
              />
            </div>
          </Container>
        </Box>

        <Box
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
          }}
        >
          <Box p="md" style={{ pointerEvents: "auto" }}>
            <ChatInput />
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
