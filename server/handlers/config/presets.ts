import type { Context } from "hono";

import type { ConfigService } from "../../services/configService.ts";
import {
  presetSchema as fullSchema,
} from "../../../shared/schemas/config.ts";

const createSchema = fullSchema.omit({ id: true });

// Factory: returns the three preset route handlers bound to the supplied
// service. The service (and the repository it sits on) is injected by
// `main.ts`, so this module no longer imports a module-eval-time singleton.
export function createPreset(svc: ConfigService) {
  return async (c: Context) => {
    const body = await c.req.json();
    const input = createSchema.parse(body);
    const preset = await svc.createPreset(input);
    return c.json(preset, 201);
  };
}

export function updatePreset(svc: ConfigService) {
  return async (c: Context) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const input = fullSchema.parse({ ...body, id });
    await svc.updatePreset(id, input);
    return c.body(null, 204);
  };
}

export function deletePreset(svc: ConfigService) {
  return async (c: Context) => {
    const id = c.req.param("id");
    await svc.deletePreset(id);
    return c.body(null, 204);
  };
}