import type { Enums } from "@/types/database.types";
import { Constants } from "@/types/database.types";

export const INDUSTRY_LABELS: Record<Enums<"industry_type">, string> = {
  restaurant: "Restaurante",
  barbershop: "Barbería / Salón",
  hotel: "Hotel / Hospedaje",
  services: "Servicios",
  other: "Otro",
};

export const INDUSTRY_OPTIONS = Constants.public.Enums.industry_type.map((value) => ({
  value,
  label: INDUSTRY_LABELS[value],
}));

export const ROLE_LABELS: Record<Enums<"user_role">, string> = {
  owner: "Propietario",
  admin: "Administrador",
  agent: "Agente",
};

// Lista IANA calculada en el servidor y enviada como prop, para que servidor y
// navegador rendericen exactamente las mismas opciones.
export function getTimezoneOptions(): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes("UTC") ? zones : ["UTC", ...zones];
}
