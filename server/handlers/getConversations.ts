import type { Context } from "hono";

import * as conversationService from "../services/conversationService.ts";

// Returns a lightweight list of conversations for the sidebar / navbar.
export async function getConversations(c: Context) {
  return c.json(await conversationService.getConversations());
}
