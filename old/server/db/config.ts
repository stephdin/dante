// Config persistence helpers. The config is a single JSON blob in one row.
// These are the only functions that should touch that row directly.

import type { Config } from "../../shared/types.ts";
import { getDb } from "./db.ts";

/** Read the config JSON blob from SQLite. */
export function getConfig(): Config {
  const row = getDb()
    .prepare("SELECT json FROM config WHERE id = 1")
    .get<{ json: string }>();
  return JSON.parse(row!.json) as Config;
}

/** Write the config JSON blob to SQLite. Caller is responsible for validation. */
export function saveConfig(config: Config): void {
  getDb()
    .prepare("UPDATE config SET json = ? WHERE id = 1")
    .run(JSON.stringify(config));
}
