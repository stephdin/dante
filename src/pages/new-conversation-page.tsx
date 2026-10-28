import { useState } from "react"
import { useNavigate } from "react-router"
import { generateId } from "ai"
import { SparklesIcon } from "lucide-react"

import { PromptInput } from "@/components/prompt-input"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { getChat } from "@/lib/chat"

export function NewConversationPage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState("")

  // Start the chat right away and hand over to the conversation page; the
  // Chat instance (and its running stream) survives the navigation.
  function handleSubmit(text: string) {
    const id = generateId()
    void getChat(id).sendMessage({ text })
    navigate(`/conversation/${id}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 p-4">
      <Empty className="flex-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SparklesIcon />
          </EmptyMedia>
          <EmptyTitle>Neue Unterhaltung</EmptyTitle>
          <EmptyDescription>
            Schreibe eine Nachricht, um die Unterhaltung zu beginnen.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
      <PromptInput
        value={draft}
        onValueChange={setDraft}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
