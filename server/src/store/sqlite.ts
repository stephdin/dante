import { DatabaseSync } from "node:sqlite"
import type { UIMessage } from "ai"
import type { ConversationStore, ToolSettingsStore } from "./store.ts"

type Row = { id: string; title: string; messages: string; updated_at: string }

export function createSqliteStore(
  path: string
): ConversationStore & ToolSettingsStore & { close(): void } {
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS conversations (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      messages   TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tool_settings (
      id      TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL
    );
  `)

  const listQuery = db.prepare(
    "SELECT id, title, updated_at FROM conversations ORDER BY updated_at DESC"
  )
  const getQuery = db.prepare("SELECT * FROM conversations WHERE id = ?")
  // The title is only set on insert, so a rename isn't undone by a run that
  // is still saving its steps.
  const saveQuery = db.prepare(`
    INSERT INTO conversations (id, title, messages, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      messages = excluded.messages, updated_at = excluded.updated_at
  `)
  const renameQuery = db.prepare(
    "UPDATE conversations SET title = ? WHERE id = ?"
  )
  const replaceTitleQuery = db.prepare(
    "UPDATE conversations SET title = ? WHERE id = ? AND title = ?"
  )
  const deleteQuery = db.prepare("DELETE FROM conversations WHERE id = ?")
  const toolStatesQuery = db.prepare("SELECT id, enabled FROM tool_settings")
  const setToolQuery = db.prepare(`
    INSERT INTO tool_settings (id, enabled) VALUES (?, ?)
    ON CONFLICT (id) DO UPDATE SET enabled = excluded.enabled
  `)

  return {
    list: () =>
      (listQuery.all() as Row[]).map((row) => ({
        id: row.id,
        title: row.title,
        updatedAt: row.updated_at,
      })),
    get: (id) => {
      const row = getQuery.get(id) as Row | undefined
      if (!row) return undefined
      return {
        id: row.id,
        title: row.title,
        messages: JSON.parse(row.messages) as UIMessage[],
        updatedAt: row.updated_at,
      }
    },
    save: ({ id, title, messages }) => {
      saveQuery.run(
        id,
        title,
        JSON.stringify(messages),
        new Date().toISOString()
      )
    },
    rename: (id, title) => renameQuery.run(title, id).changes > 0,
    replaceTitle: (id, from, to) =>
      replaceTitleQuery.run(to, id, from).changes > 0,
    delete: (id) => deleteQuery.run(id).changes > 0,
    toolStates: () =>
      new Map(
        (toolStatesQuery.all() as { id: string; enabled: number }[]).map(
          (row) => [row.id, row.enabled === 1]
        )
      ),
    setToolEnabled: (id, enabled) => {
      setToolQuery.run(id, enabled ? 1 : 0)
    },
    close: () => db.close(),
  }
}
