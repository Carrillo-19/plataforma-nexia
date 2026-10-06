import { z } from "zod";

import { isoDateTimeSchema, uuidSchema } from "./common";

export const resourceSchema = z.object({
  id: uuidSchema,
  business_id: uuidSchema,
  name: z.string(),
  capacity: z.number().int().positive(),
  is_active: z.boolean(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const createResourceSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  capacity: z.number().int().min(1).max(10_000).default(1),
  is_active: z.boolean().default(true),
});

export const updateResourceSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    capacity: z.number().int().min(1).max(10_000),
    is_active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "No hay cambios que guardar");

export type Resource = z.infer<typeof resourceSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
