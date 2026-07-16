import { Database } from "@db/sqlite";
import { MIGRATIONS, SEED_SQL } from "./schema.ts";
import { log } from "../lib/log.ts";

let db: Database | null = null;

/** Open (or return the already-open) SQLite database and run migrations. */
export function getDb(dbPath?: string): Database {
  if (db) return db;

  const path = dbPath ?? Deno.env.get("DANTE_DB_PATH") ?? "dante.db";
  log.info(`db: opening ${path}`);
  db = new Database(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  runMigrations(db);
  db.exec(SEED_SQL);

  return db;
}

function runMigrations(theDb: Database) {
  theDb.exec(
    "CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY);",
  );

  const row = theDb
    .prepare("SELECT COALESCE(MAX(version), 0) AS v FROM _migrations")
    .get<{ v: number }>();
  const current = row?.v ?? 0;

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    theDb.transaction(() => {
      theDb.exec(m.sql);
      theDb
        .prepare("INSERT INTO _migrations (version) VALUES (?)")
        .run(m.version);
    })();
    log.info(`db: migration v${m.version} applied`);
  }
}

/** Close the database. Safe to call multiple times. */
export function closeDb() {
  if (db) {
    log.info("db: closing");
    try {
      db.close();
    } catch {
      /* already closed */
    }
    db = null;
  }
}
