import { z } from "zod";

// Forma estándar de respuesta de las Server Actions de formularios: nunca se
// devuelven errores crudos de Supabase/Postgres al cliente.
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // Valores no sensibles reenviados al formulario: React 19 lo resetea tras
  // cada acción y los inputs recuperan su `defaultValue`. Nunca contraseñas.
  values?: Record<string, string>;
};

export const idleState: ActionState = { status: "idle" };

export function validationError(error: z.ZodError, values?: Record<string, string>): ActionState {
  return {
    status: "error",
    message: "Revisa los campos marcados.",
    fieldErrors: z.flattenError(error).fieldErrors,
    values,
  };
}

export function omitKeys(values: Record<string, string>, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([key]) => !keys.includes(key)));
}

export function formDataToObject(formData: FormData, keys: readonly string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    result[key] = typeof value === "string" ? value : "";
  }
  return result;
}
