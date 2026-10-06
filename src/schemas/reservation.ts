import { z } from "zod";

import { isoDateTimeSchema, reservationStatusSchema, uuidSchema } from "./common";

const MAX_RESERVATION_MS = 30 * 24 * 60 * 60 * 1000;

export const reservationSchema = z.object({
  id: uuidSchema,
  business_id: uuidSchema,
  customer_id: uuidSchema,
  resource_id: uuidSchema,
  start_time: isoDateTimeSchema,
  end_time: isoDateTimeSchema,
  status: reservationStatusSchema,
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

const timeRangeSchema = z
  .object({
    start_time: isoDateTimeSchema,
    end_time: isoDateTimeSchema,
  })
  .refine((data) => Date.parse(data.end_time) > Date.parse(data.start_time), {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["end_time"],
  })
  .refine((data) => Date.parse(data.end_time) - Date.parse(data.start_time) <= MAX_RESERVATION_MS, {
    message: "Una reserva no puede durar más de 30 días",
    path: ["end_time"],
  });

export const createReservationSchema = z
  .object({
    customer_id: uuidSchema,
    resource_id: uuidSchema,
    status: reservationStatusSchema.default("pending"),
  })
  .and(timeRangeSchema);

export const updateReservationStatusSchema = z.object({
  reservation_id: uuidSchema,
  status: reservationStatusSchema,
});

// Entrada de la herramienta `check_availability` del agente IA (Fase 4).
export const checkAvailabilitySchema = z
  .object({
    resource_id: uuidSchema.optional(),
    party_size: z.number().int().min(1).max(10_000).optional(),
  })
  .and(timeRangeSchema);

export type Reservation = z.infer<typeof reservationSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationStatusInput = z.infer<typeof updateReservationStatusSchema>;
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;
