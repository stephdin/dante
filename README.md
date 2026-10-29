# Dante

Dante is a chat interface for local and remote LLMs, focused on an elegant, distraction-free UX.

## Features

- **OpenAI-compatible and Anthropic models** — point Dante at any OpenAI-compatible endpoint (e.g. OpenCode Go) or an Anthropic-style API.
- **Streaming + reasoning** — answers stream token by token, with the model's thinking shown in a collapsible block.
- **Runs live on the server** — a reply keeps generating when you reload or navigate away, and you can stop it at any time. Partial answers are saved after every step.
- **Synced across devices** — every open tab or device gets live updates over Server-Sent Events, including replies that were started elsewhere.
- **Conversation history** — chats are stored in SQLite and listed in the sidebar, grouped by date (Heute, Gestern, …), and can be renamed or deleted.
- **Rich messages** — Markdown with syntax-highlighted code blocks, plus copy, edit and retry actions.
- **Elegant UX** — shadcn/ui (Rhea style) with light/dark/system theming, a resizable sidebar and a composer with Enter to send and Shift+Enter for a newline.

## Status

Dante is an early prototype. The model is configured through environment variables, and the settings page is still a mock.

## Tech stack

- **Frontend:** React 19, Vite, shadcn/ui on Base UI, Tailwind CSS 4, Vercel AI SDK (`@ai-sdk/react`), TanStack Query, React Router
- **Backend:** Node.js 24, Hono, Vercel AI SDK (`ai`, `@ai-sdk/openai-compatible`, `@ai-sdk/anthropic`)
- **Database:** SQLite via the built-in `node:sqlite` (`server/dante.db`, created on first run)

## Getting started

Requires Node.js 24+, pnpm and [Task](https://taskfile.dev).

```sh
# Install dependencies and create server/.env from the example
task setup

# Fill in the model settings in server/.env, then start the web app (Vite on
# :5173) and the server (Hono on :3000) with live reload
task dev
```

Open http://localhost:5173 and send a message to see it stream.

Without Task, run `pnpm install`, copy `server/.env.example` to `server/.env`, and start `pnpm dev` in the root and in `server/`.

## Configuration

The server reads `server/.env`:

| Variable              | Description                                                     |
| --------------------- | --------------------------------------------------------------- |
| `PORT`                | Server port (default: `3000`)                                   |
| `DANTE_DB_PATH`       | SQLite database file (default: `dante.db`)                      |
| `DANTE_MODEL_TYPE`    | `openai-compatible` (default) or `anthropic`                    |
| `DANTE_MODEL_URL`     | Base URL of the model API, e.g. `https://opencode.ai/zen/go/v1` |
| `DANTE_MODEL_ID`      | Model to use, e.g. `deepseek-v4-flash`                          |
| `DANTE_MODEL_API_KEY` | API key for the model provider                                  |
| `DANTE_API_TOKEN`     | Bearer token for `/api/*` routes; leave empty to disable auth   |

> The web app doesn't send a token yet, so keep `DANTE_API_TOKEN` empty for now.

## Development

```sh
task typecheck   # web app and server
task lint        # oxlint
task format      # Prettier
task check       # all of the above, e.g. before committing
```

To add shadcn/ui components, run `pnpm dlx shadcn@latest add <component>`; they land in `src/components/ui`.

## Roadmap

- **MCP servers** — connect tool servers (stdio or HTTP) so the agent can use tools like Filesystem or GitHub.
- **Agentic loops** — multi-step tool use with the tool calls shown in the chat.
- **Settings** — configure providers, models and assistants in the UI instead of env vars.
