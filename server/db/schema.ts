/**
 * Database migrations. Each migration is a versioned SQL block. The `schema_version`
 * pragma tracks which migrations have been applied.
 *
 * Tables:
 *   config           — single row, JSON blob (the full Config object)
 *   conversations    — id, label, timestamps
 *   messages         — parts-based messages with status, FK → conversations
 *   generation_jobs  — job ledger for retry state and crash recovery
 *   mcp_status       — live connection state (not stored in config)
 */

export const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        parts TEXT NOT NULL,
        stats TEXT,
        status TEXT NOT NULL DEFAULT 'complete'
          CHECK (status IN ('generating', 'complete', 'error', 'cancelled')),
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_conversation
        ON messages(conversation_id, created_at);

      CREATE TABLE IF NOT EXISTS generation_jobs (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        preset_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'running', 'completed', 'failed', 'dead', 'cancelled')),
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        next_retry_at TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_status_retry
        ON generation_jobs(status, next_retry_at);

      CREATE TABLE IF NOT EXISTS mcp_status (
        mcp_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'disconnected'
          CHECK (status IN ('connected', 'disconnected')),
        last_error TEXT,
        updated_at TEXT NOT NULL
      );
    `,
  },
];

/** Seed the config table with an empty default if no row exists. */
export const SEED_SQL = `
  INSERT OR IGNORE INTO config (id, json) VALUES (1, '{"providers":[],"assistants":[],"mcps":[],"presets":[]}');
`;
