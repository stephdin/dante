# Dante — Architecture

## Goal

A standalone Deno service that owns all communication with LLMs, MCP servers,
and tools. Every interaction — user messages, model responses, tool calls,
reasoning steps — is persisted to SQLite. Clients are viewers: they trigger work
and display state, but they never speak to a model directly. The server will
grow increasingly agentic over time, eventually initiating work on its own.

Dante is a personal tool. It is designed to be hosted once and reached from a
phone and a laptop, talking to both local models (llama.cpp) and remote
providers (OpenAI, Groq, etc.) from any client.

```
                         Dante System
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Phone ───┐                                                      │
│           ├── HTTP (commands) ──→ ┌──────────────┐ ──→ HTTP ──→  │
│           ├── WS   (events)    ──→ │              │               │
│  Laptop ──┘                       │  Deno Server │     ┌──────┐   │
│                                   │              │ ──→ │OpenAI│   │
│                                   │  ┌────────┐  │     │llama │   │
│                                   │  │ SQLite │  │     │Groq… │   │
│                                   │  └────────┘  │     └──────┘   │
│                                   └──────────────┘               │
│                                                                  │
│  The server is a protocol boundary.                              │
│  Left: HTTP for commands, WS for live events.                    │
│  Right: OpenAI-compatible HTTP to model providers.               │
│  The server translates between them and remembers everything.    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Current Architecture (v0)

```
┌──────────┐
│  Client   │  React SPA, talks to server via REST + SSE
└────┬─────┘
     │
┌────▼─────────────────────────────────────────┐
│  Hono HTTP Server (server/main.ts)            │
│                                                │
│  Handlers    Services       Repositories       │
│  ─────────   ─────────      ─────────────      │
│  streamChat → chatService → configRepo         │
│  getConfig →  configSvc  → conversationRepo   │
│  ...                   → (SQLite)            │
│                                                │
│  POST /api/chat → stream SSE → client         │
└────────────────────────────────────────────────┘
```

**Key characteristics:**

- Three-layer split: handler → service → repository
- Repository interfaces exist for a single SQLite implementation
- Chat is synchronous to the HTTP request — model call happens inside the
  handler, streamed via SSE
- If the client disconnects, generation is abandoned (assistant reply may be
  lost)
- If the model is unavailable, the client gets a 500 — no retry

---

## Design Principles

Everything added or changed should serve these:

1. **Simple data flow.** A request path should be traceable through 2–3 files,
   not jumping through interfaces, factories, and pass-through layers.

2. **The server owns the models.** The client is a viewer. It triggers actions
   and displays state — it never talks to a model directly, never holds
   generation logic.

3. **Jobs, not requests.** Long-running work (model calls) is decoupled from
   the request that started it. A POST creates a job and returns immediately.
   A worker picks it up. State changes are broadcast as events.

4. **Single database.** SQLite is the only store. No Redis, no KV, no separate
   queue backend.

5. **Two channels, each doing what it's good at.** HTTP for commands
   (request/response — standard status codes, auth, tooling, curl). WebSocket
   for events the server pushes (token streams, status changes, agent steps).
   Both channels share the same business functions.

6. **Push the trigger, pull the data.** Events carry a pointer ("conversation X
   changed," "message Y finished") and the client fetches the truth from the
   DB on demand. The exception is high-frequency streams (tokens), which carry
   their payload directly because fetching per token is not viable.

7. **Grow into an agent.** The architecture should accommodate a future where
   the server initiates work on its own (scheduled tasks, multi-step reasoning,
   tool use, MCP) without structural change.

---

## Proposed Architecture (v1)

```
┌──────────┐  ┌──────────┐
│ Client A  │  │ Client B  │  Phone + laptop.
└────┬─────┘  └────┬─────┘  Either can trigger, both see the same state.
     │              │
     │ HTTP POST/GET │  commands (request/response)
     │ WS  /events   │  events (server-push)
     │              │
┌────▼──────────────▼──────────────────────────┐
│  Deno Server (single process)                │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  HTTP layer (Hono)                       │ │
│  │  ─────────────────────                   │ │
│  │  REST routes for config, conversations,  │ │
│  │  chat.send, jobs.get, cancel. Bearer     │ │
│  │  token auth on every request.            │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  WebSocket events (/api/events)          │ │
│  │  ─────────────────────                   │ │
│  │  One socket per client. Auth via query    │ │
│  │  token on connect. Server pushes events. │ │
│  │  Client may send a small set of upstream │ │
│  │  messages (subscribe, unsubscribe,       │ │
│  │  cancel) on the same socket.            │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Event broadcaster                       │ │
│  │  ─────────────────                       │ │
│  │  In-memory map of conversation → sockets.│ │
│  │  Worker broadcasts after every DB write. │ │
│  │  Disconnect → auto-unsubscribe.          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Worker (event-driven, not polling)      │ │
│  │  ──────────────────────────────────      │ │
│  │  Awaits an in-memory job queue.          │ │
│  │  chat.send pushes a job → instant wake.  │ │
│  │  Calls model, writes tokens → DB,        │ │
│  │  broadcasts events.                      │ │
│  │  On failure: scheduled retry (setTimeout)│ │
│  │  re-enqueues at the backoff due time.    │ │
│  │  On startup: one-shot scan re-enqueues   │ │
│  │  any pending/running/overdue-retry rows. │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Business functions                      │ │
│  │  ──────────────────                      │ │
│  │  Plain functions over the DB handle.     │ │
│  │  No services, no interfaces, no DI.     │ │
│  │  Both HTTP and WS call them directly.    │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└──────────────────────┬────────────────────────┘
                       │
              ┌────────▼────────┐
              │    SQLite        │
              │  (single file)   │
              │                  │
              │  config (JSON)   │
              │  conversations    │
              │  messages        │
              │  generation_jobs  │
              └─────────────────┘
```

**Key behaviors:**

- HTTP is used for every command (create, update, delete, send, cancel). Each
  request returns a normal HTTP response.
- One WebSocket per client (`/api/events`) carries server-pushed events: token
  streams, job transitions, agent steps. The client may also send a handful of
  upstream control messages (subscribe / unsubscribe / cancel) on the same
  socket so a long-lived session has a back-channel.
- The worker is event-driven, not a polling loop. `chat.send` pushes a job onto
  an in-memory queue and the worker wakes immediately. No tick interval, no
  polling latency. The `generation_jobs` table is a **ledger** for retry state
  and crash recovery — not the dispatch mechanism.
- The worker writes to DB, then broadcasts an event. The DB is always the
  source of truth — both HTTP and WS are delivery mechanisms, not stores.
- Clients can connect and disconnect freely. On reconnect, a client fetches the
  current state over HTTP (e.g. `GET /api/conversations/:id`), then opens the
  events socket for live updates.
- Multiple clients subscribed to the same conversation see identical,
  real-time state.

---

## HTTP API

REST routes with `Authorization: Bearer <token>` on every request. Token read
from `DANTE_API_TOKEN` env var.

### Conversations

| Method | Path                     | Body         | Result                  | Notes                                            |
| ------ | ------------------------ | ------------ | ----------------------- | ------------------------------------------------ |
| GET    | `/api/conversations`     | —            | `ConversationSummary[]` | Newest-first, lightweight (last message preview) |
| GET    | `/api/conversations/:id` | —            | `Conversation`          | Full conversation with messages                  |
| POST   | `/api/conversations`     | `{ label? }` | `Conversation`          | Label optional; defaults to first user message   |
| PATCH  | `/api/conversations/:id` | `{ label }`  | `Conversation`          | Rename                                           |
| DELETE | `/api/conversations/:id` | —            | `null`                  | Cascades to messages                             |

### Chat

| Method | Path                   | Body                                  | Result                 | Notes                                                                                                                                                     |
| ------ | ---------------------- | ------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/chat`            | `{ conversationId, text, presetId? }` | `{ jobId, messageId }` | Persists user message, creates assistant row in `generating` status, creates job, returns immediately. If `presetId` omitted, the default preset is used. |
| POST   | `/api/jobs/:id/cancel` | —                                     | `null`                 | Marks the job cancelled. Worker stops at next checkpoint. The in-progress assistant row is marked with an `cancelled` status.                             |

> Note: the client sends only the new user text, not the full message history —
> the server owns history and reconstructs context from the DB when the job
> runs.

### Config

Config is stored as a single JSON object in SQLite (see Schema). It is read in
one piece and written in one piece. Mutations are **full-replacement writes** —
the client fetches, edits, and PUTs the whole object back. The server validates
the entire object against a Zod schema before writing. This is one code path,
not twelve.

| Method | Path                 | Body         | Result              | Notes                                                                                                     |
| ------ | -------------------- | ------------ | ------------------- | --------------------------------------------------------------------------------------------------------- |
| GET    | `/api/config`        | —            | `Config`            | Returns the full config                                                                                   |
| PUT    | `/api/config`        | `Config`     | `Config`            | Full replacement, validated atomically                                                                    |
| GET    | `/api/config/export` | —            | `Config` (download) | Same as GET; exists only to hint a download attachment in clients that want that. Functionally identical. |
| POST   | `/api/config/import` | `{ config }` | `Config`            | Same as PUT; alias for client convenience                                                                 |

Individual entity CRUD (createProvider / updateProvider / deleteProvider / …)
is **not** part of the protocol. The client edits the local copy, validates
with the shared Zod schema, and PUTs the whole thing. "In use" and referential
integrity checks live in the server-side schema validation on PUT.

### Jobs

| Method | Path            | Body | Result          | Notes                                                                   |
| ------ | --------------- | ---- | --------------- | ----------------------------------------------------------------------- |
| GET    | `/api/jobs/:id` | —    | `GenerationJob` | For clients that aren't connected to the events socket and need to poll |

### Health

| Method | Path          | Notes                                     |
| ------ | ------------- | ----------------------------------------- |
| GET    | `/api/health` | No auth. Returns 200 if the server is up. |

### Errors

HTTP status codes carry the outcome. Domain errors use 4xx with a JSON body:

```
{ "error": { "code": "not_found", "message": "conversation not found" } }
```

| Status | When                                                       |
| ------ | ---------------------------------------------------------- |
| 400    | Malformed body / Zod validation failed (`issues` included) |
| 401    | Missing or invalid bearer token                            |
| 404    | Resource not found                                         |
| 409    | Conflict (e.g. deleting an entity referenced by a preset)  |
| 422    | Invalid config (import/PUT) — `issues` included            |
| 500    | Internal error                                             |

---

## WebSocket Events

One socket per client at `/api/events?token=<...>`. Auth via a single token
read from `DANTE_API_TOKEN` (same as HTTP). If the token is wrong, the server
closes the socket immediately.

The socket carries two kinds of traffic:

### Server → client: events

Events are JSON objects with a `type` field. They are **triggers, not state** —
the client fetches the truth from the DB over HTTP, except for high-frequency
streams where the payload is included.

| Event            | Payload                                | When                              | Client action                                                                     |
| ---------------- | -------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `chat.token`     | `{ conversationId, messageId, parts }` | Worker writes a token to the DB   | Replace the message's parts in-place (no fetch — this is the streaming exception) |
| `chat.done`      | `{ conversationId, messageId }`        | Generation completed              | Fetch `GET /api/conversations/:id` if the conversation is in view                 |
| `chat.error`     | `{ conversationId, messageId, error }` | Job exhausted retries             | Fetch `GET /api/conversations/:id` to render the error state                      |
| `chat.cancelled` | `{ conversationId, messageId }`        | Job was cancelled                 | Fetch `GET /api/conversations/:id`                                                |
| `job.status`     | `{ jobId, status }`                    | Job transitioned state            | Optionally update local job view                                                  |
| `config.updated` | `{}`                                   | Any config mutation               | Re-fetch `GET /api/config` if the config view is open                             |
| `mcp.status`     | `{ mcpId, status }`                    | An MCP connection went up or down | Update the config view (the MCP `status` field is live, not stored in config)     |

> `chat.token.parts` is a parts-aware shape (text parts, reasoning parts, and
> in the future tool-call / tool-result parts). Even though the first version
> only emits text and reasoning parts, the shape is already parts-based so the
> agent roadmap doesn't break the protocol. The payload is the full set of
> parts accumulated so far — clients replace, not append.

### Client → server: control messages

A small set of upstream messages travels on the same socket so a long-lived
session has a back-channel without needing a new HTTP request:

| Message       | Payload              | Effect                                                                                                      |
| ------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `subscribe`   | `{ conversationId }` | Receive events for this conversation. Subscriptions are additive — one socket can watch many conversations. |
| `unsubscribe` | `{ conversationId }` | Stop receiving events for this conversation                                                                 |
| `cancel`      | `{ jobId }`          | Same as `POST /api/jobs/:id/cancel`, but on the open socket                                                 |

Other commands (config mutations, conversation CRUD, chat.send) go over HTTP.
The socket is not a dispatch bus.

---

## Auth

A single token from `DANTE_API_TOKEN` protects all routes and the events
socket. No per-method permissions, no roles, no session state.

- **HTTP**: `Authorization: Bearer <token>` header on every request. Missing or
  wrong → 401.
- **WebSocket**: `?token=<...>` query param on the `/api/events` upgrade. Wrong
  token → close the socket before it establishes. There is no per-message auth
  after that — the connection is trusted for its lifetime.

Because this is a personal tool with one user, this is enough. If multi-user
support ever matters, the seam to revisit is here, not in the business logic.

---

## Requirements

### Chat

- A client sends a message to a conversation via `POST /api/chat`. The server:
  1. persists the user message,
  2. creates an assistant message row in `generating` status (so a `conversations.get`
     during generation shows a spinner),
  3. creates a `generation_jobs` row,
  4. pushes the job id onto an in-memory queue,
  5. returns `{ jobId, messageId }` immediately.
- The worker wakes on the queue push (no polling latency), calls the configured
  model provider, and streams tokens to the DB.
- Tokens are written to the **same assistant message row** as a cumulative set
  of parts — not appended to a delta log.
- To keep SQLite write pressure sane, the worker flushes to the DB at most every
  **N ms** (debounced; N tunable, default ~150ms). The in-memory buffer is
  flushed immediately on sentence boundaries and on stream end.
- Connected clients receive `chat.token` events carrying the full cumulative
  parts — they replace, not append. (This is the streaming exception to "push
  the trigger, pull the data.")
- When generation completes, the assistant row is marked `complete` and clients
  receive a `chat.done` event (trigger only — they fetch if in view).
- If the model is unreachable, the job is marked `failed` with a retry timestamp.
  The worker retries with exponential backoff: **30s → 1m → 2m → 5m → 10m cap**.
  Retries are scheduled with `setTimeout` against the in-memory queue. If the
  server restarts mid-wait, the startup scan picks up overdue retries and
  re-enqueues them.
- After exhausting retries, the job is marked `dead`, the assistant row is
  marked with an error, and clients receive a `chat.error` event.
- A client can subscribe to a conversation at any time — including mid-generation.
  It fetches the current state via HTTP, then receives live `chat.token` events
  for subsequent tokens.
- Multiple clients subscribed to the same conversation see identical,
  real-time state.
- A `POST /api/jobs/:id/cancel` (or the `cancel` control message on the socket)
  stops a running generation. The job is marked `cancelled`, the worker stops
  at the next checkpoint, and the assistant row is marked `cancelled`. Clients
  receive a `chat.cancelled` event.

### Provider API keys

The config stores provider metadata (id, name, type, url). **API keys are never
stored in config.** They live in environment variables, looked up by the
provider id:

- `DANTE_API_KEY_<PROVIDER_ID>` (uppercase, provider id uppercased and sanitized)
- A fallback `DANTE_API_KEY` used for any provider without a specific env var.

The worker resolves the key at job start, by provider id. Missing key → job
fails with a clear error. This keeps secrets out of the config blob and out of
client exports.

### Config

- Config is stored as a single JSON object in SQLite. All providers, models,
  assistants, MCP connections, and presets live inside this object.
- Any client can read the full config.
- Any client can PUT a new full config. The server validates the entire object
  against a Zod schema (structure + referential integrity) before writing.
- "In use" checks (deleting a provider referenced by a preset, etc.) are part of
  PUT validation — there is no separate delete-by-id path. If a config would
  orphan a reference, the PUT is rejected with 422 and structured issues.
- Exactly one preset may be marked as the default. Enforced in the schema, not
  in the DB.
- The MCP `status` field is **not stored in config**. It is live-managed by the
  server's MCP client and delivered via the `mcp.status` event. A config PUT
  omits `status`; if one is present, it is ignored.
- Config can be exported (downloaded as JSON) and imported (full replacement in
  one transaction). Functionally these are GET and PUT.
- When any config changes, other connected clients receive a `config.updated`
  event and re-fetch.

### Conversations

- Conversations have an id, a label (derived from the first user message if not
  provided), and timestamps.
- Messages within a conversation have:
  - a role (`user` | `assistant`),
  - a cumulative set of **parts** (text parts; reasoning parts; in the future,
    tool-call and tool-result parts),
  - optional stats JSON,
  - a status (`generating` | `complete` | `error` | `cancelled`),
  - a timestamp.
- Conversations can be listed (lightweight, with a preview of the last message),
  fetched in full, created, renamed, and deleted.
- Deleting a conversation cascades to all its messages **and cancels any
  in-flight job** for that conversation.
- Conversations are listed newest-first.

---

## Schema

### Overview

SQLite stores three kinds of data:

| Data                         | Storage                     | Rationale                                                                                                                                                            |
| ---------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Config**                   | Single JSON blob in one row | Always read and written as a unit. No junction tables, no FK maintenance. Validated at the app layer before write. Keeps secrets out (keys live in env, not config). |
| **Conversations & messages** | Relational tables           | Queried individually (list, get by id, append message). Benefits from indexing and FK cascades.                                                                      |
| **Generation jobs**          | Relational table            | A ledger: tracks retry state, status, due time. Read on startup and by `jobs.get`. The worker does not poll it.                                                      |

### Config (single JSON object)

The `config` table has one row with a single `json` column containing the full
`Config` object:

```ts
type Config = {
  providers: Array<{
    id: string;
    name: string;
    type: "openai-compatible"; // other types may be added later
    url: string;
    models: Array<{ id: string; name: string }>;
  }>;
  assistants: Array<{ id: string; name: string; prompt: string }>;
  mcps: Array<{
    id: string;
    name: string;
    transport: "stdio" | "http" | "sse";
    // stdio:
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    // http / sse:
    url?: string;
    headers?: Record<string, string>;
  }>;
  presets: Array<{
    id: string;
    name: string;
    iconId: string;
    modelId: string; // references providers[].models[].id
    assistantId: string; // references assistants[].id
    mcpIds: string[]; // references mcps[].id
    default: boolean;
  }>;
};
```

**Requirements:**

- Read returns the parsed JSON object. PUT validates the full object against a
  Zod schema before replacing the row.
- Exactly one preset may have `default: true`. Enforced in validation.
- PUT validates structural correctness (valid URLs, non-empty names, no
  duplicate IDs within arrays, transport-specific fields present) and
  referential integrity (every `modelId`, `assistantId`, and `mcpId` must
  reference an entity within the same config).
- "In use" / orphan checks are performed on PUT — a config that would remove an
  entity still referenced by a preset is rejected.
- The MCP `status` is **not** a field of this object (see `mcp_status` below).

### Conversations and messages

**Requirements:**

- `conversations`: id, label, timestamps. Indexed by `updated_at` for list
  ordering.
- `messages`: id, conversation_id (FK → cascade), role (`user` | `assistant`),
  parts (JSON array of part objects), optional stats JSON,
  status (`generating` | `complete` | `error` | `cancelled`),
  timestamp. Indexed by `(conversation_id, created_at)` for ordered retrieval.
- Partial answers are stored by updating the same row — the parts array is
  replaced with the cumulative parts as tokens arrive. No append-only delta log.
- A `chat.send` creates the assistant row immediately in `generating` status,
  before the worker starts. A `conversations.get` during generation shows the
  spinner and any partial parts so far.
- The stats column is populated by the worker at stream end.
- Deleting a conversation cascades to messages and cancels in-flight jobs.

A `part` looks like:

```ts
type MessagePart =
  { type: "text"; text: string } | { type: "reasoning"; text: string };
// future:
// | { type: "tool-call"; toolName: string; args: unknown }
// | { type: "tool-result"; toolName: string; result: unknown };
```

### Generation jobs

**Requirements:**

- `generation_jobs`: id, conversation_id (FK → cascade), message_id (FK →
  cascade), preset_id, status (`pending` | `running` | `completed` | `failed`
  | `dead` | `cancelled`), retry_count, max_retries, next_retry_at (ISO
  timestamp), error_message, timestamps.
- Indexed on `(status, next_retry_at)` so the one-shot startup scan is a single
  indexed lookup.
- The worker does not poll this table — it is woken by an in-memory queue. The
  table is the **ledger**: retry state, status history, the thing `jobs.get`
  reads, and the thing the startup scan walks to recover after a crash.
- A config PUT that removes a provider or model does not cancel running jobs —
  the worker will fail on the next model call and schedule a retry. (The job's
  snapshot of provider/model id is its own; the worker resolves what exists at
  runtime.)

### MCP status

Because MCP status is live, not stored in config, it gets its own small table:

- `mcp_status`: mcp_id (PK), status (`connected` | `disconnected`), last_error,
  updated_at.
- Read by the config GET handler when returning config to the client — the
  handler joins `config.mcps` with `mcp_status` to produce a combined view.
- Updated by the MCP client (future) on connection state changes. State changes
  also fire an `mcp.status` event.

---

## Component Overview

| Component                  | Responsibility                                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HTTP layer (Hono)**      | REST routes for config, conversations, chat, jobs, health. Bearer auth middleware. Calls business functions directly and returns HTTP responses.                                                                                                                                      |
| **WS events layer**        | `/api/events` upgrade. Token auth on connect. Holds one socket per client, sends server events, accepts the small upstream control set (subscribe / unsubscribe / cancel). Shares the broadcaster with the worker.                                                                    |
| **Event broadcaster**      | In-memory map of conversation id → sockets. Broadcasts events to subscribers after worker writes. Cleans up on disconnect.                                                                                                                                                            |
| **Worker**                 | Single async loop awaiting an in-memory job queue. `chat.send` pushes job ids onto it. Calls the model, writes parts to the DB (throttled), broadcasts events, handles retries via `setTimeout`. On startup, does one DB scan and re-enqueues pending / running / overdue-retry rows. |
| **Business functions**     | Plain functions over the DB handle for conversations (CRUD), config (GET / PUT with validation), chat (create job from user message), and jobs (cancel, get). Both HTTP and WS call these directly — no service layer.                                                                |
| **Model client**           | Wraps the OpenAI-compatible HTTP API. Returns parts as an async generator. Cached by provider URL so it isn't rebuilt per request.                                                                                                                                                    |
| **MCP client (future)**    | Reads MCP connections from config, establishes live connections, exposes their tools to the worker, updates `mcp_status`, fires `mcp.status` events.                                                                                                                                  |
| **Database**               | Opens the SQLite file, runs migrations, provides the DB handle. The only module that touches the SQLite library directly.                                                                                                                                                             |
| **Shared types & schemas** | TypeScript types and Zod schemas for config entities and message parts. Shared between server and client for validation consistency.                                                                                                                                                  |

---

## Migration Path (v0 → v1)

Each step is independent and can be done incrementally:

1. **Add schema** — migration adds `messages.status` (default `complete` for
   existing rows), the `generation_jobs` table, a `config` table with a single
   JSON column, and the `mcp_status` table. Migrate existing normalized config
   rows into the JSON blob, preserving all IDs (provider/model/assistant/mcp
   ids stay intact so existing conversation presets keep resolving). This step
   is backwards-compatible — v0 routes still work against the old reads.

2. **Build the worker** — the in-memory job queue, the startup scan, and
   `processJob`. Test in isolation against `:memory:`. Nothing wired to it yet.

3. **Build the broadcaster** — in-memory subscription map. No dependencies on
   anything else.

4. **Build the events socket** — `/api/events` upgrade, token auth, event
   framing, the small upstream control message set.

5. **Wire the chat path** — `POST /api/chat` creates a job and returns
   `{ jobId, messageId }` instead of streaming SSE. Worker picks it up,
   broadcasts tokens via the broadcaster. Delete the old SSE handler.

6. **Simplify the layers** — delete `services/`, repository interfaces, flatten
   handlers to call business functions directly. Collapse config into a single
   JSON GET/PUT. (Can be done before or after steps 4–5.)

7. **Add retry** — worker sets `next_retry_at` on failure, schedules a
   `setTimeout` to re-enqueue at the due time.

8. **Add cancel** — `POST /api/jobs/:id/cancel` and the `cancel` upstream
   message. Worker checks the job status at the next checkpoint and stops.

9. **Start the worker from main** — wire it all together. Old `chatService.ts`
   is dead and can be deleted.

10. **Drop SSE** — once all clients use the events socket for token streaming,
    remove the SSE path entirely.

---

## Future: Agent + MCP + Tools

This architecture is designed so that adding agent capabilities changes _what
the worker does_, not _how the system is structured_.

An agent is just a worker loop with more steps:

```
Current worker:                Future agent worker:
───────────────                ───────────────────
1. Take job from queue          1. Take job from queue (or scheduled trigger)
2. Call model                   2. Call model (with MCP tools attached)
3. Write response               3. Parse tool calls from response
                                4. Execute tools (shell, file, web, MCP servers)
                                5. Feed tool results back to model
                                6. Repeat 2–5 until model emits final answer
                                7. Write final response + tool call history
```

Why this works without restructuring:

- **Job queue / worker / DB / events are unchanged.** The agent loop is a
  different `processJob` body, not a different system.
- **Message parts already support tool-call and tool-result parts.** The
  protocol shape was chosen up front to admit this.
- **`chat.token` already carries parts, not a flat string.** Tool calls and
  intermediate thoughts can stream to clients as they happen via the same event.
- **HTTP stays the command channel; the events socket stays the push channel.**
  Nothing new needs to be invented for the client.

The client sees agent steps as they happen (tool calls, intermediate thoughts,
final answer) via the same `chat.token` / `chat.done` notification stream, but
never drives the loop.

### What grows

- **Tools**: A tool registry maps tool names to implementations. The worker
  passes available tools to the model, executes any tool calls in the response,
  and feeds results back. Tools can be built-in (shell, file read/write, web
  search) or provided by MCP servers.
- **MCP client**: Reads the MCP connections from config, establishes live
  connections to configured MCP servers, and exposes their tools to the agent
  loop. The `mcp_status` table (and the `mcp.status` event) makes the
  connection state observable to clients — managed by the MCP client, not
  stored in config.
- **Triggers / scheduler**: The worker loop gains the ability to create its own
  jobs — scheduled tasks ("run every morning"), event-driven triggers ("file
  changed → analyze"), or agent-initiated follow-ups. The client stays a
  viewer. The in-memory queue and the `generation_jobs` ledger already
  accommodate server-created jobs — the only change is who pushes onto the
  queue.
- **Web Push (optional)**: When notifications need to survive a locked phone
  screen, a push-subscription table and a small sender that calls APNs / FCM
  can be added as a parallel output of the same events. The HTTP and WS
  channels don't change — Web Push is purely additive.

---

## Open Questions

A short list of decisions that can be deferred but should be revisited:

- **Throttle window for DB writes** — default proposed at ~150ms, tunable. Real
  number should come from measuring SQLite WAL throughput on the target host.
- **Provider `type` extensibility** — only `openai-compatible` today. Anthropic
  and others may need a native client later. Decide whether the model client
  switches on `type` or always wraps an OpenAI-compatible HTTP call.
- **Conversation auto-label** — derived from the first user message today.
  Worth deciding whether a rename clears the "auto" flag so the label sticks.
- **Web Push scope** — defer until the core events socket is solid and you
  actually need lock-screen notifications. Add only then; it brings VAPID keys,
  subscription storage, and platform push services with it.
