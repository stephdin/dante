import { Navigate, type RouteObject } from "react-router"

import { AppLayout, type RouteHandle } from "@/components/app-layout"
import { ChatsPage } from "@/pages/chats-page"
import { ConversationPage } from "@/pages/conversation-page"
import { NewConversationPage } from "@/pages/new-conversation-page"
import { SettingsFormPage } from "@/pages/settings-form-page"
import { SettingsPage } from "@/pages/settings-page"

const settingsHandle: RouteHandle = { title: "Einstellungen" }

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/new" replace /> },
      {
        path: "new",
        element: <NewConversationPage />,
        handle: { title: "Dante" } satisfies RouteHandle,
      },
      {
        path: "chats",
        element: <ChatsPage />,
        handle: { title: "Chats" } satisfies RouteHandle,
      },
      {
        path: "conversation/:id",
        element: <ConversationPage />,
        handle: { menu: "conversation" } satisfies RouteHandle,
      },
      {
        path: "settings",
        element: <SettingsPage />,
        handle: { ...settingsHandle, menu: "settings" } satisfies RouteHandle,
      },
      {
        path: "settings/:kind/new",
        element: <SettingsFormPage />,
        handle: settingsHandle,
      },
      {
        path: "settings/:kind/:id",
        element: <SettingsFormPage />,
        handle: settingsHandle,
      },
      { path: "*", element: <Navigate to="/new" replace /> },
    ],
  },
]
