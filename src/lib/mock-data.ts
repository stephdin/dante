// Placeholder data until the settings are connected to the server.

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

export function isSettingsKind(
  value: string | undefined
): value is SettingsKind {
  return value !== undefined && value in settingsSections
}
