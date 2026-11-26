import {
  experimental_createCodeModeTool as createCodeModeTool,
  type CodeModeTool,
} from "@ai-sdk/code-mode"
import { experimental_toolCaller as toolCaller, type ToolSet } from "ai"

// Small models print their result with console.log, as they would in a
// script. The sandbox drops console output, so the model only sees null and
// starts guessing at escaping problems. Once it works, reasoning models redo
// the whole calculation by hand to check it, and make the mistakes there.
const RETURN_RULE =
  "Console output is discarded and never shown to you. End the program " +
  "with `return <result>`; only the returned value comes back. The " +
  "returned value is computed exactly by a real JavaScript engine. Trust " +
  "it and do not recompute it by hand."

const NOTHING_RETURNED = {
  error:
    "The program returned nothing, so there is no result. console.log " +
    "output is discarded. Run it again and end it with `return <result>`.",
}

/**
 * Code mode as the AI SDK ships it, with the return rule spelled out and a
 * hint instead of null when a program returns nothing.
 */
export function codeModeTool() {
  return toolCaller(withReturnHint(createCodeModeTool({})), {
    type: "local",
    // The AI SDK binds the run's other tools here, see agent.ts.
    bind: (tools: ToolSet) => withReturnHint(createCodeModeTool(tools)),
  })
}

function withReturnHint(tool: CodeModeTool): CodeModeTool {
  const execute = tool.execute
  if (!execute) return tool
  return {
    ...tool,
    description: `${tool.description}\n\n${RETURN_RULE}`,
    execute: async (input, options) => {
      const result: unknown = await execute(input, options)
      return result ?? NOTHING_RETURNED
    },
  }
}
