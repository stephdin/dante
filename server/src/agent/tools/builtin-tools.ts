import type { ToolSet } from "ai"
import type { ConversationStore } from "../../store/store.ts"
import { calculatorTool } from "./calculator.ts"
import { datetimeTool } from "./datetime.ts"
import { searchChatsTool } from "./search-chats.ts"

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
  create: (context: ToolContext) => ToolSet[string]
}

/**
 * Tools that ship with Dante. The settings decide which of them every run
 * gets; MCP tools come on top. The id is also the name the model sees.
 */
export const builtinTools: BuiltinTool[] = [
  {
    id: "datetime",
    label: "Datum & Uhrzeit",
    description: "Das Modell kann das aktuelle Datum und die Uhrzeit abfragen.",
    enabledByDefault: true,
    create: datetimeTool,
  },
  {
    id: "calculator",
    label: "Rechner",
    description:
      "Das Modell rechnet mit einem Rechner, statt sich auf sein Kopfrechnen zu verlassen.",
    enabledByDefault: true,
    create: calculatorTool,
  },
  {
    id: "search_chats",
    label: "Chats durchsuchen",
    description:
      "Das Modell kann in deinen früheren Chats nach Stichworten suchen.",
    enabledByDefault: true,
    create: searchChatsTool,
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
  return Object.fromEntries(
    builtinTools
      .filter((tool) => states.get(tool.id) ?? tool.enabledByDefault)
      .map((tool) => [tool.id, tool.create(context)])
  )
}
