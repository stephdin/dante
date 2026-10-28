import { Link } from "react-router"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useConversations } from "@/lib/conversations"

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function ChatsPage() {
  const conversations = useConversations()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4">
      {conversations.map((chat) => (
        <Link key={chat.id} to={`/conversation/${chat.id}`}>
          <Card size="sm" className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>{chat.title}</CardTitle>
              <CardDescription className="line-clamp-1">
                {chat.running
                  ? "Antwortet…"
                  : dateFormat.format(new Date(chat.updatedAt))}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  )
}
