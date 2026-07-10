import type { Context } from "hono";

import type { ConversationService } from "../services/conversationService.ts";

// Factory: returns the route handler bound to the supplied service. The
// service (and the repository it sits on) is injected by `main.ts`, so this
// module no longer imports a module-eval-time singleton.
export function getConversations(svc: ConversationService) {
  // Returns a lightweight list of conversations for the sidebar / navbar.
  return async (c: Context) => c.json(await svc.getConversations());
}