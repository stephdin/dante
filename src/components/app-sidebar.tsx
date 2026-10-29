import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import {
  EllipsisIcon,
  ListIcon,
  PencilIcon,
  SettingsIcon,
  SquarePenIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react"

import { SidebarResizeHandle } from "@/components/sidebar-resize-handle"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { useScrollEdges } from "@/hooks/use-scroll-edges"
import type { ConversationSummary } from "@/lib/api"
import {
  useConversations,
  useDeleteConversation,
  useRenameConversation,
} from "@/lib/conversations"

export function AppSidebar({
  onWidthChange,
}: {
  onWidthChange: (width: number) => void
}) {
  const scrollRef = useScrollEdges<HTMLDivElement>()

  // Header and footer stay put; only the chat list scrolls.
  return (
    <Sidebar>
      <SidebarHeader>
        <span className="px-2 pt-1 pb-3 text-lg font-semibold">Dante</span>
        <SidebarMenu>
          <NavItem to="/new" icon={SquarePenIcon}>
            Neuer Chat
          </NavItem>
          <NavItem to="/chats" icon={ListIcon}>
            Chat-Übersicht
          </NavItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Fade only the edges that can still be scrolled. */}
      <SidebarContent
        ref={scrollRef}
        className="scroll-fade-y data-[at-bottom=true]:[--scroll-fade-b:0px] data-[at-top=true]:[--scroll-fade-t:0px]"
      >
        <ChatList />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <NavItem to="/settings" icon={SettingsIcon}>
            Einstellungen
          </NavItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarResizeHandle onWidthChange={onWidthChange} />
    </Sidebar>
  )
}

function NavItem({
  to,
  icon: Icon,
  children,
}: {
  to: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <SidebarMenuItem>
      <SidebarLink to={to}>
        <Icon />
        <span>{children}</span>
      </SidebarLink>
    </SidebarMenuItem>
  )
}

// Highlights the current page and closes the sidebar on mobile when clicked.
function SidebarLink({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarMenuButton
      isActive={pathname === to}
      render={<Link to={to} onClick={() => setOpenMobile(false)} />}
    >
      {children}
    </SidebarMenuButton>
  )
}

function ChatList() {
  const { data: conversations, isPending, isError } = useConversations()

  if (isPending || isError || conversations.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Chats</SidebarGroupLabel>
        {isPending ? (
          <SidebarMenu>
            {Array.from({ length: 5 }, (_, index) => (
              <SidebarMenuItem key={index}>
                <SidebarMenuSkeleton />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        ) : (
          <p className="px-2 py-1 text-sm text-muted-foreground">
            {isError
              ? "Chats konnten nicht geladen werden"
              : "Noch keine Chats"}
          </p>
        )}
      </SidebarGroup>
    )
  }

  return groupByDate(conversations).map((group) => (
    <SidebarGroup key={group.label}>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.chats.map((chat) => (
            <ChatItem key={chat.id} chat={chat} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ))
}

function ChatItem({ chat }: { chat: ConversationSummary }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const renameChat = useRenameConversation()
  const deleteChat = useDeleteConversation()
  const to = `/conversation/${chat.id}`

  function rename(title: string) {
    setEditing(false)
    const trimmed = title.trim()
    if (trimmed && trimmed !== chat.title) {
      renameChat.mutate({ id: chat.id, title: trimmed })
    }
  }

  function remove() {
    deleteChat.mutate(chat.id)
    if (pathname === to) navigate("/new")
  }

  return (
    <SidebarMenuItem>
      {editing ? (
        <SidebarInput
          autoFocus
          defaultValue={chat.title}
          aria-label="Chat umbenennen"
          onFocus={(event) => event.currentTarget.select()}
          onBlur={(event) => rename(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              event.currentTarget.value = chat.title
              event.currentTarget.blur()
            }
          }}
        />
      ) : (
        <>
          <SidebarLink to={to}>
            {chat.running && <Spinner aria-label="Antwortet" />}
            <span>{chat.title}</span>
          </SidebarLink>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<SidebarMenuAction showOnHover aria-label="Aktionen" />}
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-auto">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <PencilIcon /> Umbenennen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2Icon /> Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chat löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{chat.title}“ wird endgültig gelöscht.
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
    </SidebarMenuItem>
  )
}

const DAY = 24 * 60 * 60 * 1000

// The list arrives newest first, so consecutive runs make up the groups.
function groupByDate(conversations: ConversationSummary[]) {
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  const groups: { label: string; chats: ConversationSummary[] }[] = []
  for (const chat of conversations) {
    const daysAgo = Math.ceil(
      (startOfToday - new Date(chat.updatedAt).getTime()) / DAY
    )
    const label = dateLabel(daysAgo)
    const last = groups.at(-1)
    if (last?.label === label) last.chats.push(chat)
    else groups.push({ label, chats: [chat] })
  }
  return groups
}

function dateLabel(daysAgo: number) {
  if (daysAgo <= 0) return "Heute"
  if (daysAgo === 1) return "Gestern"
  if (daysAgo <= 7) return "Letzte 7 Tage"
  if (daysAgo <= 30) return "Letzte 30 Tage"
  return "Älter"
}
