import { z } from "zod";

import { industryTypeSchema, timezoneSchema } from "./common";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Correo demasiado largo")
  .pipe(z.email("Correo electrónico inválido"));

// bcrypt (Supabase Auth) ignora más allá de 72 bytes.
export const newPasswordSchema = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .max(72, "Máximo 72 caracteres")
  .regex(/[a-z]/, "Incluye al menos una minúscula")
  .regex(/[A-Z]/, "Incluye al menos una mayúscula")
  .regex(/[0-9]/, "Incluye al menos un número");

export const loginSchema = z.object({
  email: emailSchema,
  // En login no se revelan las reglas de contraseña: sólo se exige que exista.
  password: z.string().min(1, "Ingresa tu contraseña").max(72),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  business_name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120, "Máximo 120 caracteres"),
  industry_type: industryTypeSchema,
  timezone: timezoneSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
