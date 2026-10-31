import { useState, type ReactNode } from "react"
import type { DynamicToolUIPart, ReasoningUIPart, UIMessage } from "ai"

import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"

type TracePart = ReasoningUIPart | DynamicToolUIPart

export function getTraceParts(message: UIMessage) {
  return message.parts.filter(
    (part): part is TracePart =>
      part.type === "reasoning" || part.type === "dynamic-tool"
  )
}

// Reasoning and tool calls in the order the model made them; some models
// think again before every tool call, so each part gets its own line.
export function MessageTrace({
  parts,
  streaming,
}: {
  parts: TracePart[]
  streaming: boolean
}) {
  if (parts.length === 0) return null

  return (
    <Trace>
      {parts.map((part, index) =>
        part.type === "reasoning" ? (
          <ReasoningLine key={index} part={part} streaming={streaming} />
        ) : (
          <ToolLine key={part.toolCallId} part={part} streaming={streaming} />
        )
      )}
    </Trace>
  )
}

function ReasoningLine({
  part,
  streaming,
}: {
  part: ReasoningUIPart
  streaming: boolean
}) {
  const running = streaming && part.state === "streaming"

  return (
    <TraceItem
      title={running ? "Denkt nach…" : "Nachgedacht"}
      status={running ? "running" : undefined}
      autoOpen={running}
    >
      {part.text && <p className="whitespace-pre-wrap">{part.text}</p>}
    </TraceItem>
  )
}

function ToolLine({
  part,
  streaming,
}: {
  part: DynamicToolUIPart
  streaming: boolean
}) {
  const running =
    streaming &&
    (part.state === "input-streaming" || part.state === "input-available")
  const output = toolOutputText(part)
  const failed = part.state === "output-error" || isErrorResult(part.output)
  const summary = inputSummary(part.input)
  const label = part.title ?? part.toolName

  return (
    <TraceItem
      title={summary ? `${label}: ${summary}` : label}
      status={running ? "running" : failed ? "error" : undefined}
    >
      {output && (
        <pre className="max-h-64 overflow-auto font-sans text-xs whitespace-pre-wrap">
          {output}
        </pre>
      )}
    </TraceItem>
  )
}

/** A trace line that expands to show its details, if it has any. */
function TraceItem({
  title,
  status,
  autoOpen = false,
  children,
}: {
  title: string
  status?: "running" | "error"
  autoOpen?: boolean
  children: ReactNode
}) {
  // Follows `autoOpen` until the user toggles it themselves.
  const [userOpen, setUserOpen] = useState<boolean | null>(null)

  const line = (
    <TraceLine status={status}>
      <TraceTitle>{title}</TraceTitle>
    </TraceLine>
  )

  if (!children) return line

  return (
    <TraceCollapsible open={userOpen ?? autoOpen} onOpenChange={setUserOpen}>
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent>{children}</TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

// MCP results come as `{ content: [{ type: "text", text }], isError }`.
type McpResult = {
  content?: { type: string; text?: string }[]
  isError?: boolean
}

function isErrorResult(output: unknown) {
  return (output as McpResult | undefined)?.isError === true
}

function toolOutputText(part: DynamicToolUIPart) {
  if (part.state === "output-error") return part.errorText
  if (part.state !== "output-available") return undefined
  const text = (part.output as McpResult | undefined)?.content
    ?.flatMap((item) => (item.type === "text" && item.text ? [item.text] : []))
    .join("\n")
  return text || JSON.stringify(part.output, null, 2)
}

/** The first string argument, e.g. the search query or the URL. */
function inputSummary(input: unknown) {
  if (!input || typeof input !== "object") return undefined
  return Object.values(input).find(
    (value): value is string => typeof value === "string"
  )
}
