import type { Context } from "hono";
import { ZodError } from "zod";
import { configSchema } from "../../shared/schemas/config.ts";
import type { Config } from "../../shared/types.ts";
import { getDb } from "../db/db.ts";
import { broadcastAll } from "../events/broadcaster.ts";

export function get(c: Context) {
  const row = getDb()
    .prepare("SELECT json FROM config WHERE id = 1")
    .get<{ json: string }>();
  const config = JSON.parse(row!.json) as Config;
  return c.json(config);
}

export function put(c: Context) {
  return c.req.json().then((body) => {
    try {
      const parsed = configSchema.parse(body);
      const json = JSON.stringify(parsed);
      getDb().prepare("UPDATE config SET json = ? WHERE id = 1").run(json);
      broadcastAll({ type: "config.updated" });
      return c.json(parsed);
    } catch (err) {
      if (err instanceof ZodError) {
        return c.json({ error: "Validation failed", issues: err.issues }, 422);
      }
      throw err;
    }
  });
}
