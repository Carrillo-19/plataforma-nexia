import type { Enums } from "@/types/database.types";
import type { InboxConversation } from "./queries";

export const CHANNEL_LABELS: Record<Enums<"conversation_channel">, string> = {
  whatsapp: "WhatsApp",
  voice: "Voz",
};

export const SENDER_LABELS: Record<Enums<"message_sender_type">, string> = {
  customer: "Cliente",
  ai: "Asistente IA",
  human_admin: "Equipo",
};

export function customerDisplayName(customer: InboxConversation["customer"]): string {
  if (!customer) return "Cliente desconocido";
  return customer.full_name?.trim() || customer.phone_number;
}

export function customerInitials(customer: InboxConversation["customer"]): string {
  const name = customer?.full_name?.trim();
  if (!name) return "#";
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

// Las fechas se formatean SIEMPRE en la zona horaria del negocio para que el
// HTML del servidor y del navegador coincidan (sin errores de hidratación).
function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function formatMessageTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatListTime(iso: string, timeZone: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (dayKey(date, timeZone) === dayKey(now, timeZone)) return formatMessageTime(iso, timeZone);

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (dayKey(date, timeZone) === dayKey(yesterday, timeZone)) return "Ayer";

  return new Intl.DateTimeFormat("es", { timeZone, day: "numeric", month: "short" }).format(date);
}

export function formatDayDivider(iso: string, timeZone: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (dayKey(date, timeZone) === dayKey(now, timeZone)) return "Hoy";

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (dayKey(date, timeZone) === dayKey(yesterday, timeZone)) return "Ayer";

  return new Intl.DateTimeFormat("es", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(date);
}

export function isSameDay(a: string, b: string, timeZone: string): boolean {
  return dayKey(new Date(a), timeZone) === dayKey(new Date(b), timeZone);
}
