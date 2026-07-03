import { z } from "zod";

// Validation schema for POST /api/chat.
// Messages are accepted as an array of UIMessage-shaped objects; the ai SDK
// validates the exact shape when it processes the stream.
export const chatRequestSchema = z.object({
  messages: z.array(z.any()).min(1),
  conversationId: z.string().min(1),
  presetId: z.string().min(1).optional(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
