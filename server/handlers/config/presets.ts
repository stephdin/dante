import type { Context } from "hono";

import * as configService from "../../services/configService.ts";
import {
  presetSchema as fullSchema,
} from "../../../shared/schemas/config.ts";

const createSchema = fullSchema.omit({ id: true });

export async function createPreset(c: Context) {
  const body = await c.req.json();
  const input = createSchema.parse(body);
  const preset = await configService.createPreset(input);
  return c.json(preset, 201);
}

export async function updatePreset(c: Context) {
  const id = c.req.param("id");
  const body = await c.req.json();
  const input = fullSchema.parse({ ...body, id });
  await configService.updatePreset(id, input);
  return c.body(null, 204);
}

export async function deletePreset(c: Context) {
  const id = c.req.param("id");
  await configService.deletePreset(id);
  return c.body(null, 204);
}
