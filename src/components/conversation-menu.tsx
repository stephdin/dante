import { useState } from "react"
import { useNavigate } from "react-router"
import type { Chat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import {
  DownloadIcon,
  EllipsisVerticalIcon,
  FlameIcon,
  PencilIcon,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { getMessageText } from "@/lib/chat"
import {
  useConversationTitle,
  useDeleteConversation,
  useRenameConversation,
} from "@/lib/conversations"

export function ConversationMenu({ chat }: { chat: Chat<UIMessage> }) {
  const navigate = useNavigate()
  const renameChat = useRenameConversation()
  const deleteChat = useDeleteConversation()
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null)

  const title = useConversationTitle(chat.id) ?? ""

  function rename(newTitle: string) {
    setDialog(null)
    const trimmed = newTitle.trim()
    if (trimmed && trimmed !== title) {
      renameChat.mutate({ id: chat.id, title: trimmed })
    }
  }

  function remove() {
    setDialog(null)
    deleteChat.mutate(chat.id)
    navigate("/new")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Aktionen" />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto">
          <DropdownMenuItem onClick={() => setDialog("rename")}>
            <PencilIcon /> Unterhaltung umbenennen
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => downloadMarkdown(title, chat.messages)}
          >
            <DownloadIcon /> Exportieren
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDialog("delete")}
          >
            <FlameIcon /> Chat löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={dialog === "rename"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <AlertDialogContent>
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              rename(String(data.get("title")))
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Unterhaltung umbenennen</AlertDialogTitle>
            </AlertDialogHeader>
            <Input
              name="title"
              autoFocus
              defaultValue={title}
              aria-label="Titel"
              onFocus={(event) => event.currentTarget.select()}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction type="submit">Speichern</AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chat löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{title}“ wird endgültig gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function downloadMarkdown(title: string, messages: UIMessage[]) {
  const body = messages
    .map((message) => {
      const author = message.role === "user" ? "Du" : "Assistent"
      return `**${author}:**\n\n${getMessageText(message)}`
    })
    .join("\n\n---\n\n")
  const markdown = `# ${title || "Unterhaltung"}\n\n${body}\n`

  const url = URL.createObjectURL(
    new Blob([markdown], { type: "text/markdown" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = `${fileName(title)}.md`
  link.click()
  URL.revokeObjectURL(url)
}

// Strip characters that aren't allowed in file names on Windows.
function fileName(title: string) {
  return title.replace(/[<>:"/\\|?*]/g, "").trim() || "unterhaltung"
}
