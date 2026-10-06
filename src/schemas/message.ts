import { z } from "zod";

import { isoDateTimeSchema, messageSenderTypeSchema, uuidSchema } from "./common";

export const MESSAGE_MAX_LENGTH = 4096;

export const messageSchema = z.object({
  id: uuidSchema,
  business_id: uuidSchema,
  conversation_id: uuidSchema,
  sender_type: messageSenderTypeSchema,
  content: z.string(),
  created_at: isoDateTimeSchema,
});

const messageContentSchema = z
  .string()
  .trim()
  .min(1, "El mensaje no puede estar vacío")
  .max(MESSAGE_MAX_LENGTH, `Máximo ${MESSAGE_MAX_LENGTH} caracteres`);

// Mensaje enviado por un operador desde el dashboard. sender_type lo fija el
// servidor ('human_admin'); el cliente no puede elegirlo.
export const sendHumanMessageSchema = z.object({
  conversation_id: uuidSchema,
  content: messageContentSchema,
});

// Mensajes creados por el backend (webhooks / agente IA) con service_role.
export const createSystemMessageSchema = z.object({
  conversation_id: uuidSchema,
  sender_type: z.enum(["ai", "customer"]),
  content: messageContentSchema,
});

export type Message = z.infer<typeof messageSchema>;
export type SendHumanMessageInput = z.infer<typeof sendHumanMessageSchema>;
export type CreateSystemMessageInput = z.infer<typeof createSystemMessageSchema>;
