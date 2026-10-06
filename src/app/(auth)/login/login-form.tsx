"use client";

import { useActionState } from "react";

import { FormField, fieldDescribedBy } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/actions";
import { login } from "@/lib/auth/actions";

type LoginFormProps = {
  next: string;
  linkError: boolean;
};

export function LoginForm({ next, linkError }: LoginFormProps) {
  const [state, formAction] = useActionState(login, idleState);
  const errors = state.fieldErrors;
  const message =
    state.status === "error"
      ? state.message
      : linkError
        ? "El enlace no es válido o ya expiró. Inicia sesión o solicita uno nuevo."
        : undefined;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next} />

      {message && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      )}

      <FormField id="email" label="Correo electrónico" errors={errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={state.values?.email ?? ""}
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={Boolean(errors?.email?.length)}
          aria-describedby={fieldDescribedBy("email", errors?.email)}
        />
      </FormField>

      <FormField id="password" label="Contraseña" errors={errors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={72}
          required
          aria-invalid={Boolean(errors?.password?.length)}
          aria-describedby={fieldDescribedBy("password", errors?.password)}
        />
      </FormField>

      <SubmitButton className="mt-2 w-full" pendingLabel="Ingresando…">
        Iniciar sesión
      </SubmitButton>
    </form>
  );
}
