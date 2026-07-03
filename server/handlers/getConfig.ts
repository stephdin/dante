import type { Context } from "hono";

import * as configService from "../services/configService.ts";

// Returns the full client config: providers, models, assistants, presets, MCPs.
export async function getConfig(c: Context) {
  return c.json(await configService.getConfig());
}
