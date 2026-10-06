"use client";

import { useSyncExternalStore } from "react";

import { FormField, fieldDescribedBy } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { INDUSTRY_OPTIONS } from "@/lib/business-options";

type BusinessFieldsProps = {
  timezones: string[];
  values?: Partial<Record<"business_name" | "industry_type" | "timezone", string>>;
  errors?: Record<string, string[] | undefined>;
  // Nombre del campo del nombre del negocio en el FormData.
  nameField?: "business_name" | "name";
  // Preselecciona la zona horaria del navegador si no hay valor previo.
  detectTimezone?: boolean;
  disabled?: boolean;
};

const subscribeNoop = () => () => {};
const getBrowserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const getServerTimezone = () => "UTC";

export function BusinessFields({
  timezones,
  values,
  errors,
  nameField = "business_name",
  detectTimezone = false,
  disabled = false,
}: BusinessFieldsProps) {
  const browserTimezone = useSyncExternalStore(subscribeNoop, getBrowserTimezone, getServerTimezone);
  const detected = detectTimezone && timezones.includes(browserTimezone) ? browserTimezone : "UTC";
  const timezoneValue = values?.timezone || detected;

  const nameErrors = errors?.[nameField];
  const industryErrors = errors?.industry_type;
  const timezoneErrors = errors?.timezone;

  return (
    <>
      <FormField id={nameField} label="Nombre del negocio" errors={nameErrors}>
        <Input
          id={nameField}
          name={nameField}
          defaultValue={values?.business_name ?? ""}
          autoComplete="organization"
          minLength={2}
          maxLength={120}
          required
          disabled={disabled}
          aria-invalid={Boolean(nameErrors?.length)}
          aria-describedby={fieldDescribedBy(nameField, nameErrors)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="industry_type" label="Giro" errors={industryErrors}>
          <NativeSelect
            id="industry_type"
            name="industry_type"
            defaultValue={values?.industry_type ?? "restaurant"}
            required
            disabled={disabled}
            aria-invalid={Boolean(industryErrors?.length)}
            aria-describedby={fieldDescribedBy("industry_type", industryErrors)}
          >
            {INDUSTRY_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        <FormField id="timezone" label="Zona horaria" errors={timezoneErrors}>
          {/* key: remonta el select cuando se detecta la zona del navegador tras hidratar. */}
          <NativeSelect
            key={timezoneValue}
            id="timezone"
            name="timezone"
            defaultValue={timezoneValue}
            required
            disabled={disabled}
            aria-invalid={Boolean(timezoneErrors?.length)}
            aria-describedby={fieldDescribedBy("timezone", timezoneErrors)}
          >
            {timezones.map((zone) => (
              <NativeSelectOption key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
      </div>
    </>
  );
}
