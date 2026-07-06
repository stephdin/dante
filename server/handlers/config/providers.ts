import type { Context } from "hono";

import * as configService from "../../services/configService.ts";
import {
  providerSchema as fullSchema,
} from "../../../shared/schemas/config.ts";

const createSchema = fullSchema.omit({ id: true });

export async function createProvider(c: Context) {
  const body = await c.req.json();
  const input = createSchema.parse(body);
  const provider = await configService.createProvider(input);
  return c.json(provider, 201);
}

export async function updateProvider(c: Context) {
  const id = c.req.param("id");
  const body = await c.req.json();
  const input = fullSchema.parse({ ...body, id });
  await configService.updateProvider(id, input);
  return c.body(null, 204);
}

export async function deleteProvider(c: Context) {
  const id = c.req.param("id");
  await configService.deleteProvider(id);
  return c.body(null, 204);
}
