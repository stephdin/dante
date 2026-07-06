import { Database } from "@db/sqlite";

// Migrations applied on every open. The DB starts data-empty after migration —
// no seed rows are inserted by the server.
const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS providers (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        type        TEXT NOT NULL,
        url         TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS models (
        id          TEXT NOT NULL,
        provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        PRIMARY KEY (id, provider_id)
      );

      CREATE TABLE IF NOT EXISTS assistants (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        prompt      TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS mcp_connections (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        transport   TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'disconnected'
                       CHECK (status IN ('connected', 'disconnected')),
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS presets (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        icon_id       TEXT NOT NULL,
        model_id      TEXT NOT NULL,
        assistant_id  TEXT NOT NULL REFERENCES assistants(id) ON DELETE RESTRICT,
        is_default    INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS preset_mcps (
        preset_id TEXT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
        mcp_id    TEXT NOT NULL REFERENCES mcp_connections(id) ON DELETE CASCADE,
        PRIMARY KEY (preset_id, mcp_id)
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id          TEXT PRIMARY KEY,
        label       TEXT NOT NULL,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id                TEXT PRIMARY KEY,
        conversation_id   TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role              TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        text              TEXT NOT NULL,
        reasoning         TEXT,
        starred           INTEGER NOT NULL DEFAULT 0,
        stats_json        TEXT,
        created_at        TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation
        ON messages(conversation_id, created_at);
    `,
  },
];

// The single shared DB instance. Opened on the first call to getDb() and
// reused thereafter. main.ts calls getDb() once at startup so a bad config
// fails before the port binds; transitively-imported repo modules also call
// getDb() at module-eval time, which opens the DB on first import if main.ts
// hasn't gotten there yet. Idempotent either way.
let db: Database | undefined;

// Default path resolves relative to this module, not the shell's CWD — `deno
// task` can be invoked from anywhere, and a bare "dante.db" would otherwise
// land wherever the user happened to run the command. This module lives in
// server/repositories/sqlite/, so climb two levels to land dante.db at the
// server root (matches .gitignore). ":memory:" is supported for tests (pass it
// explicitly to openDatabase()).
export function getDb(): Database {
  if (db) return db;
  const newDb = openDatabase();
  db = newDb;
  return newDb;
}

// Opens a Database at the given path, sets PRAGMAs, and runs migrations.
// Exposed for tests that want their own isolated :memory: DB; for the runtime
// singleton use getDb() instead.
export function openDatabase(
  path: string | URL = new URL("../../dante.db", import.meta.url),
): Database {
  const newDb = new Database(path);
  newDb.exec("PRAGMA journal_mode=WAL"); // persistent, crash-safe; survives restarts
  newDb.exec("PRAGMA foreign_keys=ON"); // per-connection; must be set on every open
  runMigrations(newDb);
  return newDb; // no seeding — DB stays data-empty after migration
}

// Apply any pending migrations. SELECT MAX(version) on an empty
// schema_version table returns NULL, not an error — wrap in COALESCE so an
// uninitialized DB reads as version 0. foreign_keys is a per-connection pragma
// and a no-op inside a transaction, so it's set in openDatabase before this
// runs.
export function runMigrations(theDb: Database): void {
  theDb.exec(
    "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)",
  );
  const row = theDb.prepare(
    "SELECT COALESCE(MAX(version), 0) AS v FROM schema_version",
  ).get<{ v: number }>();
  const current = row?.v ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    // Each migration runs in its own transaction so a failure doesn't leave
    // the DB half-migrated.
    theDb.transaction(() => {
      theDb.exec(migration.sql);
      theDb.prepare("INSERT INTO schema_version (version) VALUES (?)").run(
        migration.version,
      );
    })();
  }
}