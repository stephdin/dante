import { serve } from "@hono/node-server"
import { streamAgent } from "./agent/agent.ts"
import { createEventBus } from "./events/bus.ts"
import { createApi } from "./http/api.ts"
import { createRuns } from "./runs/runs.ts"
import { createSqliteStore } from "./store/sqlite.ts"

const store = createSqliteStore(process.env.DANTE_DB_PATH ?? "dante.db")
const events = createEventBus()
const runs = createRuns({ store, events, agent: streamAgent })
const app = createApi({
  store,
  runs,
  events,
  token: process.env.DANTE_API_TOKEN,
})

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
