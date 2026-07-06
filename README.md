# Dante

Dante is a chat interface for local and remote LLMs with support for [MCP](https://modelcontextprotocol.io) servers, focused on an elegant, distraction-free UX.

![screenshot](/screenshot.png)

## Features

- **Local & remote providers** — works with any OpenAI-compatible endpoint. Remote providers (e.g. OpenCode Go) are wired up; local runtimes such as llama.cpp are configured and ready to be connected.
- **MCP servers** — register tool servers (stdio or SSE) and attach them to presets so an agent can call tools like Filesystem or GitHub. The config and UI are in place; full tool-call integration is on the roadmap.
- **Presets** — bundle a model, an assistant (system prompt), and a set of MCP servers into a reusable preset (e.g. Dante Pro, Dante Fast, Dante Reasoning).
- **Streaming + reasoning** — responses stream token-by-token, with the model's thinking shown in a collapsible block.
- **Elegant UX** — Mantine-based UI with light/dark/auto theming, conversation history, and a composer with Enter-to-send and Shift+Enter for a newline.

## Status

Dante is in an early prototype phase: there is no auth, and a few pieces (MCP tool-calling, the local llama.cpp backend) are designed and configured but not yet wired end-to-end. Conversations and config persist across restarts via a SQLite database at `server/dante.db`, created automatically on first run.

## Tech stack

- **Frontend:** React 19, Vite, Mantine 9, Vercel AI SDK (`@ai-sdk/react`)
- **Backend:** Deno, Hono, Vercel AI SDK (`ai`, `@ai-sdk/openai-compatible`)
- **Database:** SQLite (`@db/sqlite`) — `server/dante.db`, created on first run
- **Shared types** between client and server via a `@shared` alias

## Getting started

```sh
# 1. Start the backend (Deno + Hono on :3000). The chat endpoint requires
#    OPENCODE_API_KEY in the environment.
cd server
export OPENCODE_API_KEY=<your key>
deno task dev

# 2. Start the frontend (Vite on :5173)
cd ..
pnpm dev
```

Open http://localhost:5173, start a new conversation, and send a message to see it stream.

## Notes

- The first `deno task dev` downloads a prebuilt SQLite shared library into Deno's cache (subsequent runs are offline). Point `DENO_SQLITE_PATH` at a local library to bypass the download.
- `deno.json` already passes `--env-file`, so the cleanest way to provide the key is a `server/.env` file with `MODEL_PROVIDER_API_KEY=...`. The `export` step above is only needed if you prefer setting it in your shell.
your shell.
