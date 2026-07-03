import type { Context } from "hono";

import * as conversationService from "../services/conversationService.ts";

// Creates a new empty conversation and returns its id.
export async function createConversation(c: Context) {
  const conversation = await conversationService.createConversation();
  return c.json({ id: conversation.id }, 201);
}
