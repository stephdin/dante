// Smoke tests for the migration runner. The migration system has no "down"
// path and isn't exercised anywhere else, so these check the two properties
// we actually rely on: every expected table exists after a fresh `:memory:`
// open, and running migrations twice is a no-op (the version table gates
// re-application).
//
// Run with: deno task test
import { assertEquals } from "jsr:@std/assert@^1";

import {
  openDatabase,
  runMigrations,
  MIGRATIONS_COUNT,
} from "../repositories/sqlite/db.ts";

const EXPECTED_TABLES = [
  "schema_version",
  "providers",
  "models",
  "assistants",
  "mcp_connections",
  "presets",
  "preset_mcps",
  "conversations",
  "messages",
];

Deno.test({
  name: "openDatabase on :memory: applies all migrations and creates every table",
  async fn() {
    const db = openDatabase(":memory:");
    try {
      const rows = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      ).all<{ name: string }>();
      const tables = new Set(rows.map((r) => r.name));
      for (const expected of EXPECTED_TABLES) {
        assertEquals(
          tables.has(expected),
          true,
          `expected table ${expected} to exist, got: ${[...tables].join(", ")}`,
        );
      }
    } finally {
      db.close();
    }
  },
});

Deno.test({
  name: "schema_version reflects the latest migration after openDatabase",
  async fn() {
    const db = openDatabase(":memory:");
    try {
      const row = db.prepare(
        "SELECT COALESCE(MAX(version), 0) AS v FROM schema_version",
      ).get<{ v: number }>();
      assertEquals(row?.v, MIGRATIONS_COUNT);
    } finally {
      db.close();
    }
  },
});

Deno.test({
  name: "runMigrations is idempotent — running twice is a no-op",
  async fn() {
    const db = openDatabase(":memory:");
    try {
      // openDatabase already ran migrations; calling runMigrations again
      // must not bump the version nor throw.
      runMigrations(db);
      const row = db.prepare(
        "SELECT COALESCE(MAX(version), 0) AS v FROM schema_version",
      ).get<{ v: number }>();
      assertEquals(row?.v, MIGRATIONS_COUNT);
      // And exactly one row per migration — no duplicate inserts.
      const count = db.prepare("SELECT COUNT(*) AS c FROM schema_version").get<
        { c: number }
      >();
      assertEquals(count?.c, MIGRATIONS_COUNT);
    } finally {
      db.close();
    }
  },
});

Deno.test({
  name: "idx_presets_single_default partial unique index exists",
  async fn() {
    const db = openDatabase(":memory:");
    try {
      const rows = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_presets_single_default'",
      ).all<{ name: string }>();
      assertEquals(rows.length, 1);
    } finally {
      db.close();
    }
  },
});

Deno.test({
  name: "partial unique index rejects a second default preset",
  async fn() {
    const db = openDatabase(":memory:");
    try {
      const now = new Date().toISOString();
      // Seed an assistant so the preset.assistant_id FK is satisfiable.
      db.prepare(
        "INSERT INTO assistants (id, name, prompt, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run("as", "a", "p", now, now);
      db.prepare(
        "INSERT INTO presets (id, name, icon_id, model_id, assistant_id, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).run("p1", "a", "i", "m", "as", 1, now, now);
      // Second default should be rejected by the partial unique index.
      let threw = false;
      try {
        db.prepare(
          "INSERT INTO presets (id, name, icon_id, model_id, assistant_id, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ).run("p2", "b", "i", "m", "as", 1, now, now);
      } catch (_err) {
        threw = true;
      }
      assertEquals(threw, true, "expected a second default preset to be rejected");
      // And the first default must still be the only default.
      const defaults = db.prepare(
        "SELECT id FROM presets WHERE is_default = 1",
      ).all<{ id: string }>();
      assertEquals(defaults.length, 1);
      assertEquals(defaults[0].id, "p1");
    } finally {
      db.close();
    }
  },
});