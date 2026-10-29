import { useState } from "react"
import { useNavigate } from "react-router"
import { generateId } from "ai"

import { PromptInput } from "@/components/prompt-input"
import { getChat } from "@/lib/chat"

const greetings = {
  morning: [
    "Guten Morgen",
    "Schönen guten Morgen",
    "Na, gut geschlafen?",
    "Bereit für den Tag?",
  ],
  day: ["Guten Tag", "Hallo", "Wie läuft dein Tag?", "Was steht an?"],
  evening: ["Guten Abend", "Schönen Abend", "Wie war dein Tag?", "Feierabend?"],
  night: ["Noch wach?", "Hallo, Nachteule", "Späte Stunde", "Nachtschicht?"],
}

function greeting(hour: number) {
  const options =
    hour >= 5 && hour < 11
      ? greetings.morning
      : hour >= 11 && hour < 18
        ? greetings.day
        : hour >= 18 && hour < 23
          ? greetings.evening
          : greetings.night
  return options[Math.floor(Math.random() * options.length)]
}

export function NewConversationPage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState("")
  // Pick once per visit so the greeting doesn't change while typing.
  const [title] = useState(() => greeting(new Date().getHours()))

  // Start the chat right away and hand over to the conversation page; the
  // Chat instance (and its running stream) survives the navigation.
  function handleSubmit(text: string) {
    const id = generateId()
    void getChat(id).sendMessage({ text })
    navigate(`/conversation/${id}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-12 p-4">
      <h1 className="text-center font-heading text-4xl font-medium tracking-tight">
        {title}
      </h1>
      <PromptInput
        value={draft}
        onValueChange={setDraft}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
