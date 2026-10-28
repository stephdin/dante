import type { Context } from "hono";
import { ZodError } from "zod";
import { configSchema } from "../../shared/schemas/config.ts";
import { getConfig, saveConfig } from "../db/config.ts";
import { broadcastAll } from "../events/broadcaster.ts";
import { log } from "../lib/log.ts";

export function get(c: Context) {
  return c.json(getConfig());
}

export async function put(c: Context) {
  const body = await c.req.json();
  try {
    const parsed = configSchema.parse(body);
    saveConfig(parsed);
    broadcastAll({ type: "config.updated" });
    log.info("config: updated");
    return c.json(parsed);
  } catch (err) {
    if (err instanceof ZodError) {
      return c.json(
        {
          error: {
            code: "invalid_config",
            message: "config validation failed",
          },
          issues: err.issues,
        },
        422,
      );
    }
    throw err;
  }
}
