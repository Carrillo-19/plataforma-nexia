"use client";

import { SparklesIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { BusinessFields } from "@/components/forms/business-fields";
import { FormField, fieldDescribedBy } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { AI_PROMPT_CONTEXT_MAX_LENGTH } from "@/schemas/business";
import { updateBusinessSettings } from "./actions";

type SettingsValues = {
  business_name: string;
  industry_type: string;
  timezone: string;
  ai_prompt_context: string;
};

type SettingsFormProps = {
  timezones: string[];
  canEdit: boolean;
  defaults: SettingsValues;
};

const PROMPT_PLACEHOLDER = `Ej.: Somos una barbería en Polanco. Horario: lunes a sábado de 10:00 a 20:00.
Servicios: corte ($250, 45 min), barba ($180, 30 min).
Tono: cercano y profesional. Nunca ofrezcas descuentos sin autorización.`;

function PromptField({
  defaultValue,
  errors,
  disabled,
}: {
  defaultValue: string;
  errors?: string[];
  disabled: boolean;
}) {
  const [length, setLength] = useState(defaultValue.length);
  const nearLimit = length > AI_PROMPT_CONTEXT_MAX_LENGTH * 0.9;

  return (
    <FormField
      id="ai_prompt_context"
      label="Contexto para la IA"
      errors={errors}
      hint="Horarios, servicios, precios, políticas y tono. La IA usará esto en cada conversación."
    >
      <Textarea
        id="ai_prompt_context"
        name="ai_prompt_context"
        defaultValue={defaultValue}
        placeholder={PROMPT_PLACEHOLDER}
        maxLength={AI_PROMPT_CONTEXT_MAX_LENGTH}
        rows={12}
        disabled={disabled}
        onChange={(event) => setLength(event.currentTarget.value.length)}
        className="min-h-56 resize-y font-mono text-sm leading-relaxed"
        aria-invalid={Boolean(errors?.length)}
        aria-describedby={cn(fieldDescribedBy("ai_prompt_context", errors, true), "ai_prompt_context-count")}
      />
      <p
        id="ai_prompt_context-count"
        aria-live="polite"
        className={cn("text-right text-xs tabular-nums text-muted-foreground", nearLimit && "text-destructive")}
      >
        {length.toLocaleString("es")} / {AI_PROMPT_CONTEXT_MAX_LENGTH.toLocaleString("es")}
      </p>
    </FormField>
  );
}

export function SettingsForm({ timezones, canEdit, defaults }: SettingsFormProps) {
  const [state, formAction] = useActionState(updateBusinessSettings, idleState);

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Cambios guardados.");
    else if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  // Tras un error se muestran los valores enviados; tras guardar, los del servidor.
  const values: SettingsValues = state.status === "error" && state.values ? { ...defaults, ...state.values } : defaults;
  const disabled = !canEdit;

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Negocio</CardTitle>
          <CardDescription>Información general visible para tu equipo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <BusinessFields
            timezones={timezones}
            values={values}
            errors={state.fieldErrors}
            nameField="name"
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
            Asistente de IA
          </CardTitle>
          <CardDescription>Instrucciones base que guían cómo responde tu asistente en WhatsApp y voz.</CardDescription>
        </CardHeader>
        <CardContent>
          <PromptField
            key={values.ai_prompt_context}
            defaultValue={values.ai_prompt_context}
            errors={state.fieldErrors?.ai_prompt_context}
            disabled={disabled}
          />
        </CardContent>
        <CardFooter className="justify-between gap-4 border-t">
          <p className="text-xs text-muted-foreground">
            {canEdit ? "Los cambios se aplican a las nuevas conversaciones." : "Sólo propietarios y administradores pueden editar."}
          </p>
          {canEdit && <SubmitButton pendingLabel="Guardando…">Guardar cambios</SubmitButton>}
        </CardFooter>
      </Card>
    </form>
  );
}
