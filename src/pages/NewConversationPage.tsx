import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";

import { apiPost } from "../api/client.ts";
import { ChatLayout } from "../components/ChatLayout.tsx";

export default function NewConversationPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  // On the first send, create an (empty) conversation on the server, then hand
  // off to the conversation page with the message as pending router state.
  async function handleSend(text: string, presetId: string | undefined) {
    setCreating(true);
    try {
      const { id } = await apiPost<{ id: string }>("/conversations", {});
      navigate(`/conversation/${id}`, {
        state: { pendingMessage: text, presetId },
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <ChatLayout centered onSend={handleSend} busy={creating}>
      <EmptyState>
        <EmptyState.Indicator>
          <IconSparkles />
        </EmptyState.Indicator>
        <EmptyState.Title>Neue Unterhaltung</EmptyState.Title>
        <EmptyState.Description>
          Schreibe eine Nachricht, um die Unterhaltung zu beginnen.
        </EmptyState.Description>
      </EmptyState>
    </ChatLayout>
  );
}
