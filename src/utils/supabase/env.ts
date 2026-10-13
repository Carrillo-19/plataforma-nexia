import { z } from "zod";

const supabaseEnvSchema = z.object({
  // Debe ser la URL base del proyecto (https://<ref>.supabase.co), sin rutas
  // como /rest/v1/: el SDK las añade y una ruta extra provoca 404 en Auth.
  NEXT_PUBLIC_SUPABASE_URL: z
    .url({ protocol: /^https?$/ })
    .refine((value) => new URL(value).pathname === "/", "must be the project base URL without a path (e.g. remove /rest/v1/)"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

let cachedEnv: SupabaseEnv | undefined;

// Las variables NEXT_PUBLIC_* deben referenciarse de forma literal para que
// Next.js las incruste en el bundle del navegador.
export function getSupabaseEnv(): SupabaseEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = supabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    // Acepta la publishable key (sb_publishable_...) o la anon key clásica.
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid Supabase environment configuration: ${details}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
