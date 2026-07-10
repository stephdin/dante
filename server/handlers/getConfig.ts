import type { Context } from "hono";

import type { ConfigService } from "../services/configService.ts";

// Factory: returns the route handler bound to the supplied service. The
// service (and the repository it sits on) is injected by `main.ts`, so this
// module no longer imports a module-eval-time singleton.
export function getConfig(svc: ConfigService) {
  // Returns the full client config: providers, models, assistants, presets, MCPs.
  return async (c: Context) => c.json(await svc.getConfig());
}