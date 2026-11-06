import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"
import { generateTitle, streamAgent } from "./agent/agent.ts"
import { createBuiltinTools } from "./agent/tools/builtin-tools.ts"
import { createEventBus } from "./events/bus.ts"
import { createApi } from "./http/api.ts"
import { createRuns } from "./runs/runs.ts"
import { createSqliteStore } from "./store/sqlite.ts"

const store = createSqliteStore(process.env.DANTE_DB_PATH ?? "dante.db")
const events = createEventBus()
const runs = createRuns({
  store,
  events,
  // Read the settings per run, so a changed checkbox applies to the next answer.
  agent: ({ id, messages }, abortSignal) =>
    streamAgent(
      messages,
      abortSignal,
      createBuiltinTools(store.toolStates(), { store, conversationId: id })
    ),
  generateTitle,
})
const app = new Hono().route(
  "/",
  createApi({ store, runs, events, token: process.env.DANTE_API_TOKEN })
)

// In production (Docker) the server also serves the built web app. Unknown
// non-API paths get index.html so client-side routes survive a reload.
const staticDir = process.env.DANTE_STATIC_DIR
if (staticDir) {
  app.use("*", serveStatic({ root: staticDir }))
  app.get("*", (c, next) =>
    c.req.path.startsWith("/api/")
      ? next()
      : serveStatic({ root: staticDir, path: "index.html" })(c, next)
  )
}

const port = Number(process.env.PORT ?? 3000)
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Dante server listening on http://localhost:${info.port}`)
})

// Stop runs first so their partial answers get saved, then close the DB.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await runs.stopAll()
    store.close()
    server.close(() => process.exit(0))
  })
}
