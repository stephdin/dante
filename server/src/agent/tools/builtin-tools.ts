import type { ToolSet } from "ai"
import type { ConversationStore } from "../../store/store.ts"
import { calculatorTool } from "./calculator.ts"
import { datetimeTool } from "./datetime.ts"
import { searchChatsTool } from "./search-chats.ts"
import { tagesschauTools } from "./tagesschau.ts"

/** What a tool may need from the run it is created for. */
export type ToolContext = {
  store: ConversationStore
  conversationId: string
}

export type BuiltinTool = {
  id: string
  label: string
  description: string
  /** Whether the tool is on before the user has touched its checkbox. */
  enabledByDefault: boolean
  /** One checkbox can stand for several tools, keyed by the name the model sees. */
  create: (context: ToolContext) => ToolSet
}

/**
 * Tools that ship with Dante. The settings decide which of them every run
 * gets; MCP tools come on top.
 */
export const builtinTools: BuiltinTool[] = [
  {
    id: "datetime",
    label: "Datum & Uhrzeit",
    description: "Das Modell kann das aktuelle Datum und die Uhrzeit abfragen.",
    enabledByDefault: true,
    create: () => ({ datetime: datetimeTool() }),
  },
  {
    id: "calculator",
    label: "Rechner",
    description:
      "Das Modell rechnet mit einem Rechner, statt sich auf sein Kopfrechnen zu verlassen.",
    enabledByDefault: true,
    create: () => ({ calculator: calculatorTool() }),
  },
  {
    id: "search_chats",
    label: "Chats durchsuchen",
    description:
      "Das Modell kann in deinen früheren Chats nach Stichworten suchen.",
    enabledByDefault: true,
    create: (context) => ({ search_chats: searchChatsTool(context) }),
  },
  {
    id: "tagesschau",
    label: "Tagesschau",
    description:
      "Das Modell kann aktuelle Nachrichten und Artikel von tagesschau.de abrufen.",
    // Off until chosen, since it sends requests to an outside service.
    enabledByDefault: false,
    create: tagesschauTools,
  },
]

/** Every built-in tool with its setting; `states` holds the saved ones. */
export function builtinToolStates(states: Map<string, boolean>) {
  return builtinTools.map(({ id, label, description, enabledByDefault }) => ({
    id,
    label,
    description,
    enabled: states.get(id) ?? enabledByDefault,
  }))
}

export function createBuiltinTools(
  states: Map<string, boolean>,
  context: ToolContext
): ToolSet {
  return Object.assign(
    {},
    ...builtinTools
      .filter((tool) => states.get(tool.id) ?? tool.enabledByDefault)
      .map((tool) => tool.create(context))
  )
}
