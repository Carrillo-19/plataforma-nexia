import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

type FormFieldProps = {
  id: string;
  label: string;
  errors?: string[];
  hint?: ReactNode;
  children: ReactNode;
};

// Etiqueta + control + mensaje de error accesible. El control debe declarar
// aria-describedby={fieldDescribedBy(id, errors)} y aria-invalid.
export function FormField({ id, label, errors, hint, children }: FormFieldProps) {
  const hasErrors = Boolean(errors?.length);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !hasErrors && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {hasErrors && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}

export function fieldDescribedBy(id: string, errors?: string[], hasHint = false): string | undefined {
  if (errors?.length) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}
