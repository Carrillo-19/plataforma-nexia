import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/utils/supabase/server";

const otpTypeSchema = z.enum(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

// Destino de los enlaces de email de Supabase Auth. Soporta:
//   - Flujo PKCE (?code=...), por defecto en @supabase/ssr.
//   - Plantillas con token_hash (?token_hash=...&type=...).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = getSafeRedirectPath(searchParams.get("next"));
  const failureUrl = new URL("/login?error=link", request.nextUrl.origin);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = otpTypeSchema.safeParse(searchParams.get("type"));

  try {
    const supabase = await createClient();

    if (code && code.length <= 512) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, request.nextUrl.origin));
    } else if (tokenHash && tokenHash.length <= 512 && otpType.success) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType.data satisfies EmailOtpType,
      });
      if (!error) return NextResponse.redirect(new URL(next, request.nextUrl.origin));
    }
  } catch {
    // Se redirige al login con un error genérico.
  }

  return NextResponse.redirect(failureUrl);
}
