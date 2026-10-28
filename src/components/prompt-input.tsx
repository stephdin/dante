import { useState } from "react"
import { ArrowUpIcon, SquareIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"

export function PromptInput({
  onSubmit,
  onStop,
  busy = false,
}: {
  onSubmit: (text: string) => void
  onStop?: () => void
  busy?: boolean
}) {
  const [text, setText] = useState("")

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    onSubmit(trimmed)
    setText("")
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <InputGroup>
        <InputGroupTextarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              submit()
            }
          }}
          placeholder="Nachricht schreiben…"
          className="p-3"
        />
        <InputGroupAddon align="block-end">
          {busy ? (
            <InputGroupButton
              size="icon-sm"
              variant="default"
              className="ml-auto rounded-full"
              aria-label="Stoppen"
              onClick={onStop}
            >
              <SquareIcon />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              size="icon-sm"
              variant="default"
              className="ml-auto rounded-full"
              aria-label="Senden"
              disabled={!text.trim()}
            >
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
