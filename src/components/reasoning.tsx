import { useState } from "react"
import type { ReasoningUIPart } from "ai"

import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"

// Some models send several reasoning parts per message; each gets its own line.
export function Reasoning({
  parts,
  streaming,
}: {
  parts: ReasoningUIPart[]
  streaming: boolean
}) {
  if (parts.length === 0) return null

  return (
    <Trace>
      {parts.map((part, index) => (
        <ReasoningLine
          key={index}
          text={part.text}
          running={streaming && part.state === "streaming"}
        />
      ))}
    </Trace>
  )
}

function ReasoningLine({ text, running }: { text: string; running: boolean }) {
  // Open while thinking, closed when done, unless the user toggled it.
  const [userOpen, setUserOpen] = useState<boolean | null>(null)

  const line = (
    <TraceLine status={running ? "running" : undefined}>
      <TraceTitle>{running ? "Denkt nach…" : "Gedankengang"}</TraceTitle>
    </TraceLine>
  )

  if (!text) return line

  return (
    <TraceCollapsible open={userOpen ?? running} onOpenChange={setUserOpen}>
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <p className="whitespace-pre-wrap">{text}</p>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}
