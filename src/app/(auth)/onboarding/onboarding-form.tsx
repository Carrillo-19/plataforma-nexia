"use client";

import { useActionState } from "react";

import { BusinessFields } from "@/components/forms/business-fields";
import { SubmitButton } from "@/components/forms/submit-button";
import { idleState } from "@/lib/actions";
import { createBusiness } from "./actions";

export function OnboardingForm({ timezones }: { timezones: string[] }) {
  const [state, formAction] = useActionState(createBusiness, idleState);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <BusinessFields timezones={timezones} values={state.values} errors={state.fieldErrors} detectTimezone />

      <SubmitButton className="mt-2 w-full" pendingLabel="Creando…">
        Continuar al panel
      </SubmitButton>
    </form>
  );
}
