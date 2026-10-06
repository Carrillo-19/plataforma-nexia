import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "./env";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"] as const;
const GUEST_ONLY_PATHS = ["/login", "/register"] as const;

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function redirectWithSession(url: URL, sessionResponse: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  // Conservar cookies de sesión actualizadas (p. ej. tokens refrescados o limpiados).
  sessionResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  redirectResponse.headers.set("Cache-Control", "private, no-store");
  return redirectResponse;
}

// Refresca la sesión de Supabase en cada petición y protege las rutas privadas.
// La autorización real de datos la imponen las políticas RLS; esto es sólo la
// primera barrera de navegación.
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = getSupabaseEnv();

  const supabase = createServerClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // No ejecutar lógica entre createServerClient y getClaims(): getClaims valida
  // la firma del JWT y dispara el refresco de tokens si hace falta.
  let isAuthenticated = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    isAuthenticated = !error && Boolean(data?.claims.sub);
  } catch {
    isAuthenticated = false;
  }

  const { pathname } = request.nextUrl;

  if (!isAuthenticated && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);
    return redirectWithSession(loginUrl, response);
  }

  if (isAuthenticated && matchesPrefix(pathname, GUEST_ONLY_PATHS)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return redirectWithSession(dashboardUrl, response);
  }

  return response;
}
