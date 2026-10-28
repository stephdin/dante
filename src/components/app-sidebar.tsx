import { Link, useLocation } from "react-router"
import { ListIcon, PlusIcon, SettingsIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { useConversations } from "@/lib/conversations"

const navItems = [
  { to: "/new", label: "Neuer Chat", icon: PlusIcon },
  { to: "/chats", label: "Chat-Übersicht", icon: ListIcon },
  { to: "/settings", label: "Einstellungen", icon: SettingsIcon },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  const conversations = useConversations()
  const close = () => setOpenMobile(false)

  return (
    <Sidebar>
      <SidebarHeader>
        <span className="px-2 py-1 text-lg font-semibold">Dante</span>
      </SidebarHeader>
      <SidebarContent className="scroll-fade-y">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={pathname === item.to}
                    render={<Link to={item.to} onClick={close} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.map((chat) => {
                const to = `/conversation/${chat.id}`
                return (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      isActive={pathname === to}
                      render={<Link to={to} onClick={close} />}
                    >
                      {chat.running && <Spinner aria-label="Antwortet" />}
                      <span>{chat.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
