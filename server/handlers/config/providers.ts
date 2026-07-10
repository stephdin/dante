import type { Context } from "hono";

import type { ConfigService } from "../../services/configService.ts";
import {
  providerSchema as fullSchema,
} from "../../../shared/schemas/config.ts";

const createSchema = fullSchema.omit({ id: true });

// Factory: returns the three provider route handlers bound to the supplied
// service. The service (and the repository it sits on) is injected by
// `main.ts`, so this module no longer imports a module-eval-time singleton.
export function createProvider(svc: ConfigService) {
  return async (c: Context) => {
    const body = await c.req.json();
    const input = createSchema.parse(body);
    const provider = await svc.createProvider(input);
    return c.json(provider, 201);
  };
}

export function updateProvider(svc: ConfigService) {
  return async (c: Context) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const input = fullSchema.parse({ ...body, id });
    await svc.updateProvider(id, input);
    return c.body(null, 204);
  };
}

export function deleteProvider(svc: ConfigService) {
  return async (c: Context) => {
    const id = c.req.param("id");
    await svc.deleteProvider(id);
    return c.body(null, 204);
  };
}