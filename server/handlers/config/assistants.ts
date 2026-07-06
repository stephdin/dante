import type { Context } from "hono";

import * as configService from "../../services/configService.ts";
import {
  assistantSchema as fullSchema,
} from "../../../shared/schemas/config.ts";

const createSchema = fullSchema.omit({ id: true });

export async function createAssistant(c: Context) {
  const body = await c.req.json();
  const input = createSchema.parse(body);
  const assistant = await configService.createAssistant(input);
  return c.json(assistant, 201);
}

export async function updateAssistant(c: Context) {
  const id = c.req.param("id");
  const body = await c.req.json();
  const input = fullSchema.parse({ ...body, id });
  await configService.updateAssistant(id, input);
  return c.body(null, 204);
}

export async function deleteAssistant(c: Context) {
  const id = c.req.param("id");
  await configService.deleteAssistant(id);
  return c.body(null, 204);
}
