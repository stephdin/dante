Use the following .env variable:

```sh
# ── Dante Server — Environment Variables ─────────────────────────────────────
#
# Copy this file to .env and fill in your values:
#   cp env-example .env

# Server port (default: 3000)
PORT=3000

# API token for HTTP Bearer auth and WebSocket query auth.
# All /api/* routes (except health) require this token.
DANTE_API_TOKEN=1337

# SQLite database path (default: dante.db in the server directory).
# Use :memory: for tests.
DANTE_DB_PATH=dante.db


# ── Model Provider API Keys ─────────────────────────────────────────────────
#
# Keys are never stored in config — they live only in environment variables.
# Resolution order per provider:
#   1. MODEL_PROVIDER_API_KEY_{PROVIDER_ID}  (provider id uppercased)
#   2. MODEL_PROVIDER_API_KEY                (global fallback)
#
# Provider IDs are the same as in your config (e.g. "opencode").

# Example: OpenCode Go provider (id: "opencode")
# MODEL_PROVIDER_API_KEY_OPENCODE=sk-...

# Example: Local llama.cpp (id: "local")
# MODEL_PROVIDER_API_KEY_LOCAL=not-needed

# Global fallback for any provider without a specific key:
MODEL_PROVIDER_API_KEY=


# ── Examples ────────────────────────────────────────────────────────────────
#
# Minimal setup for OpenCode Go:
#
#   PORT=3000
#   DANTE_API_TOKEN=1337
#   MODEL_PROVIDER_API_KEY_OPENCODE=sk-your-key-here
#
# Then configure a provider in the frontend settings:
#   id:       opencode
#   name:     OpenCode Go
#   type:     openai-compatible  (or "anthropic" for MiniMax/Qwen models)
#   url:      https://opencode.ai/zen/go/v1
#   models:   opencode-go/deepseek-v4-flash, opencode-go/deepseek-v4-pro, …
```
