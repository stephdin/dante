import type { Context } from "hono";

import type { ConfigService } from "../../services/configService.ts";
import {
  assistantSchema as fullSchema,
} from "../../../shared/schemas/config.ts";

const createSchema = fullSchema.omit({ id: true });

// Factory: returns the three assistant route handlers bound to the supplied
// service. The service (and the repository it sits on) is injected by
// `main.ts`, so this module no longer imports a module-eval-time singleton.
export function createAssistant(svc: ConfigService) {
  return async (c: Context) => {
    const body = await c.req.json();
    const input = createSchema.parse(body);
    const assistant = await svc.createAssistant(input);
    return c.json(assistant, 201);
  };
}

export function updateAssistant(svc: ConfigService) {
  return async (c: Context) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const input = fullSchema.parse({ ...body, id });
    await svc.updateAssistant(id, input);
    return c.body(null, 204);
  };
}

export function deleteAssistant(svc: ConfigService) {
  return async (c: Context) => {
    const id = c.req.param("id");
    await svc.deleteAssistant(id);
    return c.body(null, 204);
  };
}