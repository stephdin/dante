import type { Context } from "hono";

import type { ConfigService } from "../../services/configService.ts";
import {
  mcpConnectionSchema as fullSchema,
} from "../../../shared/schemas/config.ts";

// status is server-managed (created as "disconnected", mutated by the future
// connection lifecycle), so neither create nor update accepts it from the
// client. id comes from the route param on update, not the body.
const bodySchema = fullSchema.omit({ id: true, status: true });

// Factory: returns the three MCP route handlers bound to the supplied
// service. The service (and the repository it sits on) is injected by
// `main.ts`, so this module no longer imports a module-eval-time singleton.
export function createMcp(svc: ConfigService) {
  return async (c: Context) => {
    const body = await c.req.json();
    const input = bodySchema.parse(body);
    const mcp = await svc.createMcp(input);
    return c.json(mcp, 201);
  };
}

export function updateMcp(svc: ConfigService) {
  return async (c: Context) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const input = bodySchema.parse(body);
    await svc.updateMcp(id, input);
    return c.body(null, 204);
  };
}

export function deleteMcp(svc: ConfigService) {
  return async (c: Context) => {
    const id = c.req.param("id");
    await svc.deleteMcp(id);
    return c.body(null, 204);
  };
}