import { z } from "zod";

import { conversationChannelSchema, isoDateTimeSchema, uuidSchema } from "./common";

export const conversationSchema = z.object({
  id: uuidSchema,
  business_id: uuidSchema,
  customer_id: uuidSchema,
  channel: conversationChannelSchema,
  is_bot_active: z.boolean(),
  last_message_at: isoDateTimeSchema.nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const createConversationSchema = z.object({
  customer_id: uuidSchema,
  channel: conversationChannelSchema,
});

// Toggle "Modo Bot / Intervención Humana" (Fase 3).
export const toggleBotModeSchema = z.object({
  conversation_id: uuidSchema,
  is_bot_active: z.boolean(),
});

export type Conversation = z.infer<typeof conversationSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type ToggleBotModeInput = z.infer<typeof toggleBotModeSchema>;
