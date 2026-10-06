import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "./env";

export type TypedSupabaseClient = SupabaseClient<Database>;

// Cliente para Client Components. Usa la clave publicable: todo acceso a datos
// queda limitado por las políticas RLS del usuario autenticado.
export function createClient(): TypedSupabaseClient {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = getSupabaseEnv();
  return createBrowserClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
