"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

import {
  realtimeConversationSchema,
  realtimeMessageSchema,
  type RealtimeConversation,
  type RealtimeMessage,
} from "@/schemas/inbox";
import { createClient } from "@/utils/supabase/client";

export type RealtimeStatus = "connecting" | "live" | "reconnecting" | "offline";

type InboxRealtimeHandlers = {
  onMessage: (message: RealtimeMessage) => void;
  onConversation: (conversation: RealtimeConversation, event: "INSERT" | "UPDATE") => void;
  // Se invoca cada vez que el canal (re)conecta: los eventos emitidos mientras
  // no había conexión no se reenvían, así que hay que volver a consultar.
  onResync: () => void;
};

export function useInboxRealtime(businessId: string, handlers: InboxRealtimeHandlers): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function connect() {
      try {
        // Realtime debe unirse al canal con el JWT del usuario: sin él usaría la
        // clave pública y RLS no entregaría ningún evento. Después, supabase-js
        // renueva el token del socket automáticamente al refrescar la sesión.
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!data.session) {
          setStatus("offline");
          return;
        }
        await supabase.realtime.setAuth(data.session.access_token);
        if (cancelled) return;

        // El filtro por business_id reduce tráfico; el aislamiento real lo
        // garantiza RLS, que Realtime evalúa por cada suscriptor. No se escucha
        // DELETE: esos eventos no pasan por RLS ni admiten filtros.
        const filter = `business_id=eq.${businessId}`;
        channel = supabase
          .channel(`inbox:${businessId}:${crypto.randomUUID()}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter }, (payload) => {
            const parsed = realtimeMessageSchema.safeParse(payload.new);
            if (parsed.success) handlersRef.current.onMessage(parsed.data);
          })
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations", filter }, (payload) => {
            const parsed = realtimeConversationSchema.safeParse(payload.new);
            if (parsed.success) handlersRef.current.onConversation(parsed.data, "INSERT");
          })
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations", filter }, (payload) => {
            const parsed = realtimeConversationSchema.safeParse(payload.new);
            if (parsed.success) handlersRef.current.onConversation(parsed.data, "UPDATE");
          })
          .subscribe((channelStatus) => {
            if (cancelled) return;
            if (channelStatus === "SUBSCRIBED") {
              setStatus("live");
              handlersRef.current.onResync();
            } else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
              // realtime-js reintenta la conexión por sí mismo con backoff.
              setStatus("reconnecting");
            } else if (channelStatus === "CLOSED") {
              setStatus("offline");
            }
          });
      } catch {
        if (!cancelled) setStatus("reconnecting");
      }
    }

    void connect();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [businessId]);

  return status;
}
