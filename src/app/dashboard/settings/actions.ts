"use server";

import { revalidatePath } from "next/cache";

import { formDataToObject, validationError, type ActionState } from "@/lib/actions";
import { canManageBusiness, requireMember } from "@/lib/auth/dal";
import { businessSettingsSchema } from "@/schemas/business";
import { createClient } from "@/utils/supabase/server";

const SAVE_ERROR = "No pudimos guardar los cambios. Inténtalo de nuevo.";

export async function updateBusinessSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Autorización dentro de la acción: el formulario puede invocarse sin pasar por la UI.
  const member = await requireMember();
  if (!canManageBusiness(member.role)) {
    return { status: "error", message: "Sólo propietarios y administradores pueden modificar la configuración." };
  }

  const raw = formDataToObject(formData, ["name", "industry_type", "timezone", "ai_prompt_context"]);
  const values = {
    business_name: raw.name,
    industry_type: raw.industry_type,
    timezone: raw.timezone,
    ai_prompt_context: raw.ai_prompt_context,
  };

  const parsed = businessSettingsSchema.safeParse(raw);
  if (!parsed.success) return validationError(parsed.error, values);

  try {
    const supabase = await createClient();
    // El id sale de la sesión, nunca del formulario; RLS lo vuelve a verificar.
    const { data, error } = await supabase
      .from("businesses")
      .update(parsed.data)
      .eq("id", member.business.id)
      .select("id");

    if (error) {
      if (error.code === "22023") {
        return { status: "error", fieldErrors: { timezone: ["Zona horaria no soportada"] }, values };
      }
      console.error("[settings] business update failed", { code: error.code });
      return { status: "error", message: SAVE_ERROR, values };
    }
    if (!data || data.length !== 1) {
      return { status: "error", message: "No tienes permiso para modificar este negocio.", values };
    }
  } catch {
    return { status: "error", message: SAVE_ERROR, values };
  }

  revalidatePath("/dashboard", "layout");
  return { status: "success", message: "Configuración guardada." };
}
