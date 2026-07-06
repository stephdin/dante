import type { Context } from "hono";

import * as configService from "../../services/configService.ts";
import {
  mcpConnectionSchema as fullSchema,
} from "../../../shared/schemas/config.ts";

const createSchema = fullSchema.omit({ id: true, status: true });

export async function createMcp(c: Context) {
  const body = await c.req.json();
  const input = createSchema.parse(body);
  const mcp = await configService.createMcp(input);
  return c.json(mcp, 201);
}

export async function updateMcp(c: Context) {
  const id = c.req.param("id");
  const body = await c.req.json();
  const input = fullSchema.parse({ ...body, id });
  await configService.updateMcp(id, input);
  return c.body(null, 204);
}

export async function deleteMcp(c: Context) {
  const id = c.req.param("id");
  await configService.deleteMcp(id);
  return c.body(null, 204);
}
