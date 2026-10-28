import { Link } from "react-router"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { conversations } from "@/lib/mock-data"

export function ChatsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4">
      {conversations.map((chat) => (
        <Link key={chat.id} to={`/conversation/${chat.id}`}>
          <Card size="sm" className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>{chat.label}</CardTitle>
              <CardDescription className="line-clamp-1">
                {chat.preview}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  )
}
