import { Outlet, useMatches } from "react-router"
import {
  ClipboardIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  FileDownIcon,
  FileUpIcon,
  FlameIcon,
  PencilIcon,
  StarIcon,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export type RouteHandle = {
  title?: string
  menu?: "conversation" | "settings"
}

export function AppLayout() {
  const handle = useMatches().at(-1)?.handle as RouteHandle | undefined

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 px-3">
          <SidebarTrigger />
          <h1 className="flex-1 truncate text-center font-medium">
            {handle?.title}
          </h1>
          <HeaderMenu menu={handle?.menu} />
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Menu actions are placeholders for now.
function HeaderMenu({ menu }: { menu: RouteHandle["menu"] }) {
  if (!menu) {
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
        {menu === "conversation" ? (
          <>
            <DropdownMenuItem>
              <PencilIcon /> Unterhaltung umbenennen
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ClipboardIcon /> Unterhaltung kopieren
            </DropdownMenuItem>
            <DropdownMenuItem>
              <StarIcon /> Markierte Nachrichten anzeigen
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DownloadIcon /> Exportieren
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <FlameIcon /> Chat löschen
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem>
              <FileUpIcon /> Konfiguration importieren
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileDownIcon /> Konfiguration exportieren
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
