import type { Context } from "hono";

import type { ConfigService } from "../../services/configService.ts";
import { configSchema } from "../../../shared/schemas/config.ts";

// Factory: returns the import handler bound to the supplied service.
// Validates the incoming JSON against the shared Config schema, then
// passes the validated payload to the service for a transactional replace.
export function importConfig(svc: ConfigService) {
  return async (c: Context) => {
    const body = await c.req.json();
    const config = configSchema.parse(body);
    await svc.importConfig(config);
    return c.body(null, 204);
  };
}
