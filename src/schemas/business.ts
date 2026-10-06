import { z } from "zod";

import { industryTypeSchema, isoDateTimeSchema, timezoneSchema, uuidSchema } from "./common";

export const businessSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  industry_type: industryTypeSchema,
  ai_prompt_context: z.string(),
  timezone: z.string(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

const businessNameSchema = z.string().trim().min(2, "Mínimo 2 caracteres").max(120, "Máximo 120 caracteres");

// Onboarding: entrada de public.create_business_for_current_user().
export const createBusinessSchema = z.object({
  name: businessNameSchema,
  industry_type: industryTypeSchema,
  timezone: timezoneSchema.default("UTC"),
});

export const AI_PROMPT_CONTEXT_MAX_LENGTH = 8000;

// Formulario completo de /dashboard/settings. id y business_id nunca vienen del cliente.
export const businessSettingsSchema = z.object({
  name: businessNameSchema,
  industry_type: industryTypeSchema,
  ai_prompt_context: z
    .string()
    .trim()
    .max(AI_PROMPT_CONTEXT_MAX_LENGTH, `Máximo ${AI_PROMPT_CONTEXT_MAX_LENGTH} caracteres`),
  timezone: timezoneSchema,
});

export const updateBusinessSchema = businessSettingsSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "No hay cambios que guardar");

export type Business = z.infer<typeof businessSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
