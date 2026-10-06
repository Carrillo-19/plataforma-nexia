import { z } from "zod";

import { isoDateTimeSchema, phoneNumberSchema, uuidSchema } from "./common";

export const customerSchema = z.object({
  id: uuidSchema,
  business_id: uuidSchema,
  phone_number: z.string(),
  full_name: z.string().nullable(),
  loyalty_visits: z.number().int().nonnegative(),
  preferences_summary: z.string().nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const createCustomerSchema = z.object({
  phone_number: phoneNumberSchema,
  full_name: z.string().trim().min(1).max(120).nullable().optional(),
  preferences_summary: z.string().trim().max(4000).nullable().optional(),
});

export const updateCustomerSchema = createCustomerSchema
  .extend({
    loyalty_visits: z.number().int().nonnegative().max(1_000_000),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "No hay cambios que guardar");

export type Customer = z.infer<typeof customerSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
