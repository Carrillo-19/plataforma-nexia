import "server-only";

import { z } from "zod";

const siteUrlSchema = z.url({ protocol: /^https?$/ });

// URL pública de la app, usada en los enlaces de email de Supabase Auth.
// No se deriva del header Host para evitar envenenamiento de enlaces.
export function getSiteUrl(): string {
  const parsed = siteUrlSchema.safeParse(process.env.NEXT_PUBLIC_SITE_URL);
  if (parsed.success) return parsed.data.replace(/\/+$/, "");

  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("NEXT_PUBLIC_SITE_URL must be set in production");
}
