import { ArrowUpIcon, SquareIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"

export function PromptInput({
  value,
  onValueChange,
  onSubmit,
  onStop,
  busy = false,
  ref,
}: {
  value: string
  onValueChange: (value: string) => void
  onSubmit: (text: string) => void
  onStop?: () => void
  busy?: boolean
  ref?: React.Ref<HTMLTextAreaElement>
}) {
  function submit() {
    const trimmed = value.trim()
    if (!trimmed || busy) return
    onSubmit(trimmed)
    onValueChange("")
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
          ref={ref}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
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
              disabled={!value.trim()}
            >
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
