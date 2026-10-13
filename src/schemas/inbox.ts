import { z } from "zod";

import { conversationChannelSchema, messageSenderTypeSchema, uuidSchema } from "./common";

// Los eventos de Supabase Realtime son datos externos: se validan antes de
// tocar el estado de la UI. Las fechas llegan en el formato de texto de
// Postgres, que no siempre es ISO 8601 estricto; se normalizan a ISO.
const realtimeTimestampSchema = z.string().transform((value, ctx) => {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const time = Date.parse(/[+-]\d{2}$/.test(normalized) ? `${normalized}:00` : normalized);
  if (Number.isNaN(time)) {
    ctx.addIssue({ code: "custom", message: "Fecha inválida" });
    return z.NEVER;
  }
  return new Date(time).toISOString();
});

export const realtimeMessageSchema = z.object({
  id: uuidSchema,
  conversation_id: uuidSchema,
  sender_type: messageSenderTypeSchema,
  content: z.string(),
  created_at: realtimeTimestampSchema,
});

export const realtimeConversationSchema = z.object({
  id: uuidSchema,
  channel: conversationChannelSchema,
  is_bot_active: z.boolean(),
  last_message_at: realtimeTimestampSchema.nullable(),
});

// Parámetro `?c=` de la URL de la bandeja.
export const inboxSearchParamsSchema = z.object({
  c: uuidSchema.optional().catch(undefined),
});

export type RealtimeMessage = z.infer<typeof realtimeMessageSchema>;
export type RealtimeConversation = z.infer<typeof realtimeConversationSchema>;
