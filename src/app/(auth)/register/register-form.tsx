"use client";

import { MailCheckIcon } from "lucide-react";
import { useActionState } from "react";

import { BusinessFields } from "@/components/forms/business-fields";
import { FormField, fieldDescribedBy } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FadeIn } from "@/components/motion/fade-in";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/actions";
import { register } from "@/lib/auth/actions";

const PASSWORD_HINT = "Mínimo 10 caracteres, con mayúscula, minúscula y número.";

export function RegisterForm({ timezones }: { timezones: string[] }) {
  const [state, formAction] = useActionState(register, idleState);
  const errors = state.fieldErrors;

  if (state.status === "success") {
    return (
      <FadeIn className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheckIcon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold">Revisa tu correo</h2>
        <p role="status" className="text-sm text-muted-foreground">
          {state.message}
        </p>
      </FadeIn>
    );
  }

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <BusinessFields timezones={timezones} values={state.values} errors={errors} detectTimezone />

      <FormField id="email" label="Correo electrónico" errors={errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={state.values?.email ?? ""}
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
          aria-invalid={Boolean(errors?.email?.length)}
          aria-describedby={fieldDescribedBy("email", errors?.email)}
        />
      </FormField>

      <FormField id="password" label="Contraseña" errors={errors?.password} hint={PASSWORD_HINT}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          required
          aria-invalid={Boolean(errors?.password?.length)}
          aria-describedby={fieldDescribedBy("password", errors?.password, true)}
        />
      </FormField>

      <SubmitButton className="mt-2 w-full" pendingLabel="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
