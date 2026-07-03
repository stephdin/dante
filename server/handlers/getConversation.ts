import type { Context } from "hono";

import { AppError } from "../lib/errors.ts";
import * as conversationService from "../services/conversationService.ts";

// Returns a single conversation with all messages. 404 if it does not exist.
export async function getConversation(c: Context) {
  const id = c.req.param("id");
  const conversation = await conversationService.getConversation(id);
  if (!conversation) {
    throw new AppError("not found", 404);
  }
  return c.json(conversation);
}
