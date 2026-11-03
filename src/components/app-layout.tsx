import { Outlet, useMatches } from "react-router"
import type { Chat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import { EllipsisVerticalIcon, FileDownIcon, FileUpIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { ConversationMenu } from "@/components/conversation-menu"
import { useSidebarWidth } from "@/components/sidebar-resize-handle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useConversationTitle } from "@/lib/conversations"

export type RouteHandle = {
  title?: string
  menu?: "conversation" | "settings"
}

export function AppLayout() {
  const match = useMatches().at(-1)
  const handle = match?.handle as RouteHandle | undefined
  const conversationTitle = useConversationTitle(match?.params.id)
  const [sidebarWidth, setSidebarWidth] = useSidebarWidth()

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
    >
      <AppSidebar onWidthChange={setSidebarWidth} />
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 px-3">
          <SidebarTrigger />
          <h1 className="flex-1 truncate text-center font-medium">
            {handle?.title ?? conversationTitle}
          </h1>
          {handle?.menu === "conversation" ? (
            // The conversation route's loader returns its live Chat.
            <ConversationMenu chat={match!.loaderData as Chat<UIMessage>} />
          ) : (
            <SettingsMenu show={handle?.menu === "settings"} />
          )}
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Menu actions are placeholders for now.
function SettingsMenu({ show }: { show: boolean }) {
  if (!show) {
    // Keep the slot so the title stays centered.
    return <div className="size-7" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Aktionen" />}
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuItem>
          <FileUpIcon /> Konfiguration importieren
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileDownIcon /> Konfiguration exportieren
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
