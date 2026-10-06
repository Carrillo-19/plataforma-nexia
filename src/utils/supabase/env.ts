import { z } from "zod";

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
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
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid Supabase environment configuration: ${missing}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
