"use server";

import { redirect } from "next/navigation";

import { formDataToObject, omitKeys, validationError, type ActionState } from "@/lib/actions";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { getSiteUrl } from "@/lib/site-url";
import { loginSchema, registerSchema } from "@/schemas/auth";
import { createClient } from "@/utils/supabase/server";

const RATE_LIMIT_CODES = new Set(["over_request_rate_limit", "over_email_send_rate_limit", "too_many_requests"]);

const GENERIC_ERROR = "No pudimos completar la solicitud. Inténtalo de nuevo en unos minutos.";
const RATE_LIMIT_ERROR = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
const SENSITIVE_FIELDS = ["password"] as const;

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formDataToObject(formData, ["email", "password"]);
  const values = omitKeys(raw, SENSITIVE_FIELDS);

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return validationError(parsed.error, values);

  const next = getSafeRedirectPath(formData.get("next"));

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      if (error.code === "email_not_confirmed") {
        return {
          status: "error",
          message: "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.",
          values,
        };
      }
      if (error.code && RATE_LIMIT_CODES.has(error.code)) {
        return { status: "error", message: RATE_LIMIT_ERROR, values };
      }
      // Mensaje genérico: no revela si el correo existe.
      return { status: "error", message: "Correo o contraseña incorrectos.", values };
    }
  } catch {
    return { status: "error", message: GENERIC_ERROR, values };
  }

  redirect(next);
}

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formDataToObject(formData, ["email", "password", "business_name", "industry_type", "timezone"]);
  const values = omitKeys(raw, SENSITIVE_FIELDS);

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return validationError(parsed.error, values);

  const { email, password, business_name, industry_type, timezone } = parsed.data;
  let hasSession = false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`,
        // Consumido por el trigger private.handle_new_auth_user().
        data: { business_name, industry_type, timezone },
      },
    });

    if (error) {
      if (error.code === "weak_password") {
        return {
          status: "error",
          message: "Elige una contraseña más segura.",
          fieldErrors: { password: ["Contraseña demasiado débil o filtrada en brechas conocidas"] },
          values,
        };
      }
      if (error.code && RATE_LIMIT_CODES.has(error.code)) {
        return { status: "error", message: RATE_LIMIT_ERROR, values };
      }
      if (error.code !== "user_already_exists" && error.code !== "email_exists") {
        // Sólo en el log del servidor; al cliente nunca se le envía el detalle.
        console.error("[auth] signUp failed", {
          name: error.name,
          status: error.status,
          code: error.code ?? "unknown",
          message: error.message,
        });
        return { status: "error", message: GENERIC_ERROR, values };
      }
      // Correo ya registrado: misma respuesta que un alta normal (anti-enumeración).
    }

    hasSession = Boolean(data.session);
  } catch (error) {
    console.error("[auth] signUp threw", error instanceof Error ? { name: error.name, message: error.message } : error);
    return { status: "error", message: GENERIC_ERROR, values };
  }

  if (hasSession) redirect("/dashboard");

  return {
    status: "success",
    message: `Si ${email} es válido, recibirás un enlace para confirmar tu cuenta. Revisa también la carpeta de spam.`,
  };
}

export async function logout(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Aunque falle la revocación remota, las cookies locales se limpian.
  }
  redirect("/login");
}
