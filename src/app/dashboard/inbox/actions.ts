"use server";

import { requireMember } from "@/lib/auth/dal";
import type { InboxMessage } from "@/lib/inbox/queries";
import { toggleBotModeSchema } from "@/schemas/conversation";
import { sendHumanMessageSchema } from "@/schemas/message";
import { createClient } from "@/utils/supabase/server";

export type InboxActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

const NOT_FOUND = "La conversación no existe o no tienes acceso a ella.";

// Las Server Actions son endpoints públicos: se valida sesión, tenant y datos
// en cada llamada, sin confiar en lo que la UI haya comprobado antes.

export async function setBotMode(input: unknown): Promise<InboxActionResult<{ is_bot_active: boolean }>> {
  const member = await requireMember();

  const parsed = toggleBotModeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Solicitud inválida." };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("conversations")
      .update({ is_bot_active: parsed.data.is_bot_active })
      .eq("id", parsed.data.conversation_id)
      .eq("business_id", member.business.id)
      .select("is_bot_active")
      .maybeSingle();

    if (error) {
      console.error("[inbox] bot mode update failed", { code: error.code });
      return { ok: false, message: "No pudimos cambiar el modo. Inténtalo de nuevo." };
    }
    if (!data) return { ok: false, message: NOT_FOUND };

    return { ok: true, data };
  } catch {
    return { ok: false, message: "No pudimos cambiar el modo. Inténtalo de nuevo." };
  }
}

export async function sendHumanMessage(input: unknown): Promise<InboxActionResult<InboxMessage>> {
  const member = await requireMember();

  const parsed = sendHumanMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Mensaje inválido." };
  }

  try {
    const supabase = await createClient();

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("is_bot_active")
      .eq("id", parsed.data.conversation_id)
      .eq("business_id", member.business.id)
      .maybeSingle();

    if (conversationError) {
      console.error("[inbox] conversation lookup failed", { code: conversationError.code });
      return { ok: false, message: "No pudimos enviar el mensaje. Inténtalo de nuevo." };
    }
    if (!conversation) return { ok: false, message: NOT_FOUND };
    // Evita que la IA y una persona respondan a la vez al cliente.
    if (conversation.is_bot_active) {
      return { ok: false, message: "Activa la intervención humana antes de escribir." };
    }

    // sender_type y business_id los fija el servidor; RLS vuelve a exigirlos.
    const { data, error } = await supabase
      .from("messages")
      .insert({
        business_id: member.business.id,
        conversation_id: parsed.data.conversation_id,
        sender_type: "human_admin",
        content: parsed.data.content,
      })
      .select("id, conversation_id, sender_type, content, created_at")
      .single();

    if (error) {
      console.error("[inbox] message insert failed", { code: error.code });
      return { ok: false, message: "No pudimos enviar el mensaje. Inténtalo de nuevo." };
    }

    // TODO(Fase 4): entregar el mensaje al cliente vía WhatsApp Cloud API.
    return { ok: true, data };
  } catch {
    return { ok: false, message: "No pudimos enviar el mensaje. Inténtalo de nuevo." };
  }
}
