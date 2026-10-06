"use server";

import { redirect } from "next/navigation";

import { formDataToObject, validationError, type ActionState } from "@/lib/actions";
import { getCurrentMember, requireSessionUser } from "@/lib/auth/dal";
import { createBusinessSchema } from "@/schemas/business";
import { createClient } from "@/utils/supabase/server";

export async function createBusiness(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSessionUser();
  if (await getCurrentMember()) redirect("/dashboard");

  const values = formDataToObject(formData, ["business_name", "industry_type", "timezone"]);
  const parsed = createBusinessSchema.safeParse({
    name: values.business_name,
    industry_type: values.industry_type,
    timezone: values.timezone,
  });

  if (!parsed.success) {
    const state = validationError(parsed.error, values);
    // El esquema usa `name`; el formulario, `business_name`.
    const { name, ...rest } = state.fieldErrors ?? {};
    return { ...state, fieldErrors: { ...rest, business_name: name } };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_business_for_current_user", {
      p_name: parsed.data.name,
      p_industry_type: parsed.data.industry_type,
      p_timezone: parsed.data.timezone,
    });

    // 23505: el usuario ya pertenece a un negocio → simplemente ir al panel.
    if (error && error.code !== "23505") {
      if (error.code === "22023") {
        return { status: "error", fieldErrors: { timezone: ["Zona horaria no soportada"] }, values };
      } else {
        console.error("[onboarding] create_business_for_current_user failed", { code: error.code });
        return { status: "error", message: "No pudimos crear tu negocio. Inténtalo de nuevo.", values };
      }
    }
  } catch {
    return { status: "error", message: "No pudimos crear tu negocio. Inténtalo de nuevo.", values };
  }

  redirect("/dashboard");
}
