import { z } from "zod";

import { Constants } from "@/types/database.types";

export const uuidSchema = z.uuid();

// E.164: '+' seguido de 7 a 15 dígitos (mismo CHECK que en la base de datos).
export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9][0-9]{6,14}$/, "El teléfono debe estar en formato internacional E.164 (ej. +5215512345678)");

export const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Zona horaria IANA inválida");

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const industryTypeSchema = z.enum(Constants.public.Enums.industry_type);
export const userRoleSchema = z.enum(Constants.public.Enums.user_role);
export const reservationStatusSchema = z.enum(Constants.public.Enums.reservation_status);
export const conversationChannelSchema = z.enum(Constants.public.Enums.conversation_channel);
export const messageSenderTypeSchema = z.enum(Constants.public.Enums.message_sender_type);

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: isoDateTimeSchema.optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;
