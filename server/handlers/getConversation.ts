import type { Context } from "hono";

import { AppError } from "../lib/errors.ts";
import type { ConversationService } from "../services/conversationService.ts";

// Factory: returns the route handler bound to the supplied service. The
// service (and the repository it sits on) is injected by `main.ts`, so this
// module no longer imports a module-eval-time singleton.
export function getConversation(svc: ConversationService) {
  // Returns a single conversation with all messages. 404 if it does not exist.
  return async (c: Context) => {
    const id = c.req.param("id");
    const conversation = await svc.getConversation(id);
    if (!conversation) {
      throw new AppError("not found", 404);
    }
    return c.json(conversation);
  };
}