import { useEffect, useState } from "react"
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  RotateCcwIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { MessageFooter } from "@/components/ui/message"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function AssistantActions({
  text,
  onRetry,
}: {
  text: string
  onRetry?: () => void
}) {
  return (
    <MessageFooter className="-ms-2 gap-0.5 px-0">
      <CopyAction text={text} />
      {onRetry && (
        <Action label="Erneut versuchen" onClick={onRetry}>
          <RotateCcwIcon />
        </Action>
      )}
    </MessageFooter>
  )
}

export function UserActions({
  text,
  onEdit,
}: {
  text: string
  onEdit: () => void
}) {
  return (
    <MessageFooter className="gap-0.5">
      <CopyAction text={text} />
      <Action label="Bearbeiten" onClick={onEdit}>
        <PencilIcon />
      </Action>
    </MessageFooter>
  )
}

function CopyAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <Action
      label={copied ? "Kopiert" : "Kopieren"}
      onClick={() => {
        navigator.clipboard
          .writeText(text)
          .then(() => setCopied(true))
          .catch(() => {})
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Action>
  )
}

// Ghost icon button with a tooltip.
function Action({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className="text-muted-foreground"
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
