import type { Context } from "hono";

import type { ConfigService } from "../../services/configService.ts";

const date = () => new Date().toISOString().slice(0, 10);

// Factory: returns the export handler bound to the supplied service.
// Same data as GET /api/config, but with a Content-Disposition header
// so the browser triggers a file download instead of displaying raw JSON.
export function exportConfig(svc: ConfigService) {
  return async (c: Context) => {
    const config = await svc.getConfig();
    c.header(
      "Content-Disposition",
      `attachment; filename="dante-config-${date()}.json"`,
    );
    return c.json(config);
  };
}
