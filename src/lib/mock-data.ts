import type { UIMessage } from "ai"

// Placeholder data until the server is connected again.

export type ConversationSummary = {
  id: string
  label: string
  preview: string
}

export const conversations: ConversationSummary[] = [
  {
    id: "demo-1",
    label: "Rezeptideen für den Herbst",
    preview: "Was kann ich mit Kürbis kochen?",
  },
  {
    id: "demo-2",
    label: "Urlaubsplanung",
    preview: "Drei Tage in Lissabon – was lohnt sich?",
  },
]

export const initialMessages: Record<string, UIMessage[]> = {
  "demo-1": [
    {
      id: "demo-1-user",
      role: "user",
      parts: [{ type: "text", text: "Was kann ich mit Kürbis kochen?" }],
    },
    {
      id: "demo-1-assistant",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Zum Beispiel eine Kürbissuppe, Ofenkürbis mit Feta oder ein Kürbisrisotto.",
        },
      ],
    },
  ],
}

export type SettingsKind = "providers" | "assistants" | "presets" | "mcps"

export const settingsSections: Record<
  SettingsKind,
  { title: string; singular: string; items: { id: string; name: string }[] }
> = {
  presets: {
    title: "Presets",
    singular: "Preset",
    items: [{ id: "default", name: "Standard" }],
  },
  providers: {
    title: "Provider",
    singular: "Provider",
    items: [{ id: "local", name: "Lokales Modell" }],
  },
  assistants: {
    title: "Assistenten",
    singular: "Assistent",
    items: [{ id: "helper", name: "Hilfreicher Assistent" }],
  },
  mcps: {
    title: "MCP-Server",
    singular: "MCP-Server",
    items: [],
  },
}

export function isSettingsKind(value: string | undefined): value is SettingsKind {
  return value !== undefined && value in settingsSections
}
