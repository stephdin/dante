import { createMCPClient, type MCPClient } from "@ai-sdk/mcp"
import type { ToolSet } from "ai"

// Comma-separated Streamable HTTP endpoints; this moves into the settings later.
const urls = (process.env.DANTE_MCP_URLS ?? "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean)

/**
 * Connects to every MCP server for one run. Local HTTP connections are cheap,
 * and a fresh one per run doesn't care whether a server restarted meanwhile.
 * A server that is down is skipped, so the chat still works without its tools.
 */
export async function connectMcp() {
  const clients = (await Promise.all(urls.map(connect))).filter(
    (client) => client !== undefined
  )
  const toolSets = await Promise.all(clients.map((client) => client.tools()))
  return {
    tools: Object.assign({}, ...toolSets) as ToolSet,
    async close() {
      await Promise.allSettled(clients.map((client) => client.close()))
    },
  }
}

async function connect(url: string): Promise<MCPClient | undefined> {
  try {
    return await createMCPClient({
      transport: { type: "http", url },
      clientName: "dante",
    })
  } catch (error) {
    console.warn(`MCP server ${url} unavailable:`, error)
    return undefined
  }
}
