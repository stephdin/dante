# Backend Notes — Dante Chat App

**Date:** 2026-07-02
**Status:** Mockup phase, in-memory, no auth
**Goal:** Context document for future work — summarizes the current implementation, known pitfalls, and a roadmap.

---

## 1. Architecture Overview

Two processes in development, communicating via a Vite proxy:

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│  Frontend (Vite :5173)      │     │  Backend (Deno + Hono :3000)  │
│  React + Mantine + AI SDK   │     │  In-memory store + OpenCode Go│
│                             │     │                               │
│  /api/* ──proxy────────────►│────►│  /api/health                  │
│                             │     │  /api/stats                   │
│  useChat (ai/react)         │     │  /api/config                  │
│   └─ DefaultChatTransport   │     │  /api/conversations           │
│      POST /api/chat (SSE)   │────►│  /api/conversations/:id       │
│                             │     │  /api/chat (streamText)       │
└─────────────────────────────┘     └──────────────────────────────┘
```

- **Frontend:** React 19 + Vite 8 + Mantine 9 + AI SDK 7 (`ai`, `@ai-sdk/react`)
- **Backend:** Deno 2.9 + Hono 4 + AI SDK 7 (`ai`, `@ai-sdk/openai-compatible`)
- **LLM provider:** OpenCode Go (`https://opencode.ai/zen/go/v1`)
- **Shared types:** `shared/types.ts` imported by both sides via `@shared` alias
- **Package manager:** pnpm (frontend), Deno JSR/npm specifiers (backend)

---

## 2. File Map

### Backend (`server/`)

| File | Purpose |
|---|---|
| `deno.json` | Tasks (`dev`, `start`), import map (Hono, ai, openai-compatible). Flags: `--allow-net --allow-read --allow-env --allow-sys --watch` |
| `main.ts` | Hono app: all routes, chat streaming via `streamText`, logging hooks |
| `data.ts` | In-memory config + conversations, CRUD helpers, model/preset resolution |
| `log.ts` | `log()`, `requestLogger()` middleware, `stats` + `getStats()` |
| `.env.example` | Documents `OPENCODE_API_KEY` and optional `OPENCODE_MODEL` |
| `.env` | Gitignored — your actual API key goes here |

### Shared (`shared/`)

| File | Purpose |
|---|---|
| `types.ts` | `Config`, `Provider`, `Model`, `Assistant`, `McpConnection`, `Preset`, `Message`, `Conversation`, `ConversationSummary` |

### Frontend (`src/`)

| File | Purpose |
|---|---|
| `api/client.ts` | `apiGet<T>()` — thin fetch wrapper |
| `api/queries.ts` | `useConfig`, `useConversations`, `useConversation` — simple data-fetching hooks |
| `api/useChat.ts` | `useConversationChat(id)` — wraps `useChat` + `DefaultChatTransport`; `uiMessageText` / `uiMessageReasoning` helpers |
| `config/presetIcons.ts` | Maps wire `iconId` → Tabler icon component (icons live frontend-only) |
| `utils/formatDate.ts` | `formatRelativeDate()` — "Heute" / "Gestern" / "28. Jun." |
| `utils/groupMessages.ts` | `buildChatItems()` — flattens messages + inserts date dividers |
| `components/ChatInput.tsx` | Controlled composer: Enter sends, Shift+Enter newline, Stopp button while streaming |
| `components/ChatLayout.tsx` | Scrollable message area + floating composer; threads `onSend`/`onStop`/`busy` |
| `components/AgentMessage.tsx` | Agent bubble with collapsible "Gedanken" (reasoning) block |
| `components/UserMessage.tsx` | User bubble |
| `components/ChatNavbar.tsx` | Drawer nav — conversation list from `/api/conversations` |
| `pages/ChatOverviewPage.tsx` | Conversation list with empty/error states |
| `pages/ConversationPage.tsx` | The main chat view — keyed by id, seeds from server, streams via `useChat` |
| `pages/NewConversationPage.tsx` | Empty state + composer; first send creates conversation then navigates |
| `pages/SettingsPage.tsx` | Config editor — seeds from `/api/config`, edits stay client-side |

### Config

| File | Purpose |
|---|---|
| `vite.config.ts` | `@shared` alias, `/api` proxy → `localhost:3000` |
| `tsconfig.app.json` | `@shared/*` path mapping, includes `shared/` |
| `.gitignore` | `server/.env` added |

---

## 3. API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/stats` | Request counts, chat totals, tokens, uptime |
| GET | `/api/config` | Providers, assistants, MCPs, presets |
| GET | `/api/conversations` | Conversation summaries (id, label, preview, updatedAt) |
| GET | `/api/conversations/:id` | Full conversation with messages |
| POST | `/api/conversations` | Create empty conversation → `{ id }` (201) |
| POST | `/api/chat` | Stream a completion. Body: `{ messages, conversationId, presetId? }` |

### `/api/chat` flow

1. Parse `{ messages, conversationId, presetId }`
2. Validate conversation exists (404 if not)
3. Validate `OPENCODE_API_KEY` is set (500 if not)
4. **Persist the user message** to the in-memory store *before* streaming
5. Resolve model id from preset (`resolveModel`) — config model ids ARE OpenCode Go ids, no mapping
6. Resolve system prompt from preset's assistant (`resolveInstructions`)
7. `streamText({ model, instructions, messages, onChunk, onEnd, onError })`
8. `onChunk`: count deltas, log time-to-first-token
9. `onEnd`: log summary, **persist the assistant reply**
10. Return `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream, sendReasoning: true }) })`

---

## 4. Key Implementation Details

### AI SDK v7 patterns used

- **Client:** `useChat` from `@ai-sdk/react` with `DefaultChatTransport({ api: "/api/chat" })`
- **Send:** `sendMessage({ text }, { body: { conversationId, presetId } })` — the `body` carries custom fields
- **Message shape:** `message.parts: [{ type: "text", text }]` and `[{ type: "reasoning", text }]`
- **Status:** `"ready" | "submitted" | "streaming" | "error"`
- **Server:** `streamText` → `toUIMessageStream` → `createUIMessageStreamResponse`
- **Convert:** `convertToModelMessages(messages)` to turn UIMessages into model messages
- **Reasoning:** `sendReasoning: true` in `toUIMessageStream` forwards thinking tokens

### New conversation flow

1. User types on `/new` and hits send
2. `NewConversationPage` POSTs to `/api/conversations`, gets `{ id }`
3. Navigates to `/conversation/:id` with router state `{ pendingMessage, presetId }`
4. `ConversationPage` (keyed by id → fresh `useChat` instance) detects pending message in `location.state`
5. Once `status === "ready"`, auto-sends via `sendMessage` with the `body` fields
6. Clears router state so a refresh doesn't resend

### Seeding vs. streaming coordination

`ConversationPage` uses two refs to avoid race conditions:
- `seededRef` — prevents re-seeding from server after initial load
- `sentRef` — prevents seeding if a message was already auto-sent from `/new`

If the user came from `/new`, we skip seeding (the server history is empty and would clobber the in-flight stream). Otherwise, we seed `setMessages(conversation.messages.map(toUIMessage))`.

### Model resolution

Config model ids are the OpenCode Go model ids directly (e.g. `"glm-5.2"`, `"deepseek-v4-flash"`). `resolveModel(presetId)` just looks up the preset → model and returns `model.id`. No mapping table needed. Fallback: `OPENCODE_MODEL` env var, then `"deepseek-v4-flash"`.

### Preset → system prompt

`resolveInstructions(presetId)` looks up the preset's `assistantId` → assistant's `prompt`. Passed as `instructions` to `streamText`.

### Icon handling

Backend sends `iconId: "sparkles" | "bolt" | "brain"` (a string). Frontend maps it to a Tabler icon component via `src/config/presetIcons.ts`. This keeps React components off the wire.

### Starred messages

The `starred` flag rides through `UIMessage.metadata` when seeding from the server. The server's `Message` type has `starred?: boolean`; `toUIMessage` sets `metadata: { starred: m.starred ?? false }`.

---

## 5. Pitfalls Encountered

These are things that cost time during implementation and are worth remembering:

### TypeScript 6 + path aliases
- `baseUrl` is **deprecated in TS 6** and triggers `TS5101`. Use `paths` without `baseUrl`, with relative targets: `"@shared/*": ["./shared/*"]`
- `verbatimModuleSyntax: true` requires `import type` for type-only imports

### Deno specifics
- `deno check` needs the config flag: `deno check --config server/deno.json ...` (not `--config=...`)
- `@ai-sdk/openai-compatible` transitively loads `@vercel/oidc`, which calls `os.hostname()` — requires `--allow-sys` permission, otherwise: `NotCapable: Requires sys access to "hostname"`
- Stale Deno processes can hold port 3000; kill with `taskkill //F //IM deno.exe` (Windows)

### AI SDK v7 vs. older versions
- v7 is the current version (as of July 2026). The API differs substantially from v3/v4:
  - `sendMessage({ text })` not `handleSubmit`
  - `message.parts` not `message.content`
  - `DefaultChatTransport` not raw `api` option on `useChat`
  - `createUIMessageStreamResponse` + `toUIMessageStream` not `toDataStreamResponse`
- `@openrouter/ai-sdk-provider@2.x` peers on `ai@^6` — incompatible with v7. Use `@ai-sdk/openai-compatible@^3` instead (peers only on `zod`)
- `UIMessage.role` includes `"system"`, so casting `m.role as "user" | "assistant"` is needed for our `ChatMessage` type
- `UIMessage` doesn't declare `createdAt` in its type, but `useChat` attaches one at runtime — access via cast: `(m as { createdAt?: Date }).createdAt`

### Mantine v9
- `Collapse` uses `expanded` prop, **not** `in` (v6/v7) or `opened` (v8) — check the installed `.d.ts` if unsure
- `EmptyState` is available (used in `NewConversationPage`)

### Frontend build
- `vite build` works even when `tsc -b` fails on pre-existing unused imports (Vite uses esbuild/rolldown, which is lenient)
- The `ai` SDK adds ~112 modules to the bundle; total is ~736 kB — code-splitting the chat page would help

---

## 6. Known Limitations (Mockup-Acceptable)

| Limitation | Impact | Effort to fix |
|---|---|---|
| **Reasoning not persisted** | Reasoning visible during stream, gone after refresh | Small — add `reasoning?` to `Message`, capture in `onEnd` |
| **Failed stream leaves orphan user message** | User msg persisted, no assistant reply; resend to recover | Medium — wrap persistence in a transaction or defer user-msg save to `onEnd` |
| **No server-side abort** | Client `stop()` cancels the fetch but the server keeps generating | Medium — pass an `AbortController` to `streamText` |
| **Stats are in-memory** | Reset on server restart | Small — wrap in a module, or persist to a file/DB later |
| **Hardcoded model list** | Models in `data.ts` are static; OpenCode Go has more | Small — fetch from `https://opencode.ai/zen/go/v1/models` at startup |
| **Settings edits not persisted** | `SettingsPage` seeds from API but edits are client-only | Medium — add PUT/PATCH routes for config entities |
| **No auth** | Anyone can hit the API | Large — out of scope for mockup |
| **No conversation deletion** | The "Chat löschen" menu item does nothing | Small — add `DELETE /api/conversations/:id` |
| **Regenerate/delete message buttons not wired** | Icons exist in `AgentMessage`/`UserMessage` but do nothing | Small — `useChat` exposes `regenerate()` and `setMessages()` |
| **Bundle size** | 736 kB main chunk | Small — lazy-load `ConversationPage` |

---

## 7. Roadmap — Where to Go From Here

### Tier 1: Quick wins (low effort, high value)

1. **Persist reasoning** — add `reasoning?: string` to `Message` in `shared/types.ts`; in `server/main.ts` `onEnd`, capture reasoning from the result and store it; in `toUIMessage` on the frontend, add a `reasoning` part when seeding.

2. **Wire regenerate/delete** — `useChat` returns `regenerate()` and `setMessages()`. The "Neu generieren" and "Löschen" icons in `AgentMessage`/`UserMessage` are ready to connect. Regenerate should re-POST to `/api/chat` with the same body.

3. **Mantine notifications** — replace the inline red error text in `ConversationPage`/`ChatOverviewPage`/`ChatNavbar` with `notifications.show({ color: "red", ... })`. The `useChat` `onError` callback and the `error` state are already available.

4. **Conversation deletion** — add `DELETE /api/conversations/:id` to the backend; wire the "Chat löschen" menu item in `App.tsx` to call it and navigate away.

### Tier 2: Robustness

5. **Abort handling** — create an `AbortController` in the `/api/chat` handler, pass its `signal` to `streamText({ abortSignal })`. Hono's `c.req.raw.signal` fires when the client disconnects.

6. **Fix orphan user messages** — either defer user-message persistence to `onEnd` (so it only saves if the stream succeeds), or add a cleanup on `onError` that removes the last user message if no assistant reply was appended.

7. **Dynamic model list** — fetch from `https://opencode.ai/zen/go/v1/models` at server startup (or on first `/api/config` request) and merge into the config. Closes the gap between hardcoded models and what OpenCode Go actually offers.

8. **Code-split the chat page** — `const ConversationPage = lazy(() => import("./pages/ConversationPage"))` to trim the initial bundle by ~200 kB.

### Tier 3: Features

9. **Persist config edits** — add `PUT /api/config/providers/:id`, `PUT /api/config/assistants/:id`, etc. Wire `SettingsPage` handlers to POST changes back. The settings state is already shaped for this.

10. **MCP integration** — the `mcpIds` field on presets is unused. The AI SDK supports MCP tool servers; wiring them would let the agent call Filesystem/GitHub tools. This is a bigger feature requiring `@ai-sdk/mcp` or similar.

11. **Streaming Markdown rendering** — `AgentMessage` currently renders plain text (`whiteSpace: "pre-wrap"`). Adding a Markdown renderer (e.g. `react-markdown` + `remark-gfm`) with streaming-safe behavior would improve code block rendering significantly.

12. **Multi-provider support** — the `llama.cpp` provider in the config has no backend wiring. Adding a second `createOpenAICompatible` instance for local models would enable on-device inference.

13. **Persistence layer** — swap the in-memory arrays for SQLite (Deno has `jsr:@db/sqlite`) or a JSON file on disk. The data access is already centralized in `data.ts`, so this is a clean swap.

---

## 8. How to Run

```sh
# 1. Add your OpenCode Go API key
cp server/.env.example server/.env
# Edit server/.env: OPENCODE_API_KEY=<your key>

# 2. Start the backend (terminal 1)
cd server
deno task dev
# → [SERVER] listening on http://localhost:3000

# 3. Start the frontend (terminal 2)
pnpm dev
# → http://localhost:5173

# 4. Open the app
# Navigate to /new, type a message, watch it stream
```

### Validation commands

```sh
# Backend typecheck
deno check --config server/deno.json server/main.ts server/data.ts

# Frontend typecheck
pnpm exec tsc -b

# Lint
pnpm lint

# Build
pnpm build

# Stats endpoint
curl http://localhost:3000/api/stats
```

---

## 9. Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENCODE_API_KEY` | Yes | — | OpenCode Go API key for `/api/chat` |
| `OPENCODE_MODEL` | No | `deepseek-v4-flash` | Fallback model when preset can't resolve |

---

## 10. Dependencies

### Frontend (`package.json`)

- `@mantine/core@^9`, `@mantine/hooks@^9` — UI
- `@tabler/icons-react@^3` — icons
- `react@^19`, `react-dom@^19`
- `react-router-dom@^7`
- `ai@^7` — AI SDK core
- `@ai-sdk/react@^4` — `useChat` hook

### Backend (`server/deno.json`)

- `jsr:@hono/hono@^4` — web framework
- `npm:ai@^7.0.0` — AI SDK core (`streamText`, `toUIMessageStream`, etc.)
- `npm:@ai-sdk/openai-compatible@^3.0.0` — OpenCode Go provider

---

*This document reflects the state of the codebase as of 2026-07-02. Update it when making significant architectural changes.*
