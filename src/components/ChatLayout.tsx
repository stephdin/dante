import { forwardRef, type ReactNode } from "react";
import { Box, Container } from "@mantine/core";

import { ChatInput } from "./ChatInput.tsx";

// Shared layout for chat screens (new + existing conversation): a scrollable
// message area that fills the available height, with the composer overlaid at
// the bottom so messages can scroll behind the rounded Paper. The scroll
// container ref is forwarded so pages can anchor to the bottom on mount or on
// conversation change.
export const ChatLayout = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    centered?: boolean;
    onSend?: (text: string, presetId: string | undefined) => void;
    onStop?: () => void;
    busy?: boolean;
  }
>(function ChatLayout({ children, centered, onSend, onStop, busy }, ref) {
  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        position: "relative",
      }}
    >
      <Box
        ref={ref}
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
        <Container
          size="md"
          p="md"
          style={
            centered
              ? {
                  minHeight: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }
              : undefined
          }
        >
          {children}
        </Container>
      </Box>

      <Box
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          // Transparent wrapper: only the rounded Paper inside is opaque, so
          // messages scrolling up are cut off by the Paper's rounded edge.
          // Let scroll/touch pass through the empty padding area; the input
          // re-enables events on itself.
          pointerEvents: "none",
        }}
      >
        <Box p="md" style={{ pointerEvents: "auto" }}>
          <ChatInput onSend={onSend} onStop={onStop} busy={busy} />
        </Box>
      </Box>
    </Box>
  );
});
