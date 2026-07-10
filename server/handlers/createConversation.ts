import type { Context } from "hono";

import type { ConversationService } from "../services/conversationService.ts";

// Factory: returns the route handler bound to the supplied service. The
// service (and the repository it sits on) is injected by `main.ts`, so this
// module no longer imports a module-eval-time singleton.
export function createConversation(svc: ConversationService) {
  // Creates a new empty conversation and returns its id.
  return async (c: Context) => {
    const conversation = await svc.createConversation();
    return c.json({ id: conversation.id }, 201);
  };
}