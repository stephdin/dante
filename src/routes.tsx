import { Navigate, type RouteObject } from "react-router"

import { AppLayout, type RouteHandle } from "@/components/app-layout"
import { loadChat } from "@/lib/chat"
import { ChatsPage } from "@/pages/chats-page"
import { ConversationPage } from "@/pages/conversation-page"
import { NewConversationPage } from "@/pages/new-conversation-page"
import { SettingsPage } from "@/pages/settings-page"

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/new" replace /> },
      {
        path: "new",
        element: <NewConversationPage />,
      },
      {
        path: "chats",
        element: <ChatsPage />,
        handle: { title: "Chats" } satisfies RouteHandle,
      },
      {
        path: "conversation/:id",
        loader: ({ params }) => loadChat(params.id!),
        element: <ConversationPage />,
        handle: { menu: "conversation" } satisfies RouteHandle,
      },
      {
        path: "settings",
        element: <SettingsPage />,
        handle: { title: "Einstellungen" } satisfies RouteHandle,
      },
      { path: "*", element: <Navigate to="/new" replace /> },
    ],
  },
]
