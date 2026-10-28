import { DatabaseSync } from "node:sqlite"
import type { UIMessage } from "ai"
import type { ConversationStore } from "./store.ts"

type Row = { id: string; title: string; messages: string; updated_at: string }

export function createSqliteStore(
  path: string
): ConversationStore & { close(): void } {
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS conversations (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      messages   TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  const listQuery = db.prepare(
    "SELECT id, title, updated_at FROM conversations ORDER BY updated_at DESC"
  )
  const getQuery = db.prepare("SELECT * FROM conversations WHERE id = ?")
  const saveQuery = db.prepare(`
    INSERT INTO conversations (id, title, messages, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      title = excluded.title, messages = excluded.messages, updated_at = excluded.updated_at
  `)
  const deleteQuery = db.prepare("DELETE FROM conversations WHERE id = ?")

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
    delete: (id) => deleteQuery.run(id).changes > 0,
    close: () => db.close(),
  }
}
