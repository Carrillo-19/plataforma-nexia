"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  compareConversations,
  fetchConversation,
  fetchConversations,
  fetchMessages,
  mergeMessages,
  upsertMessage,
  type InboxConversation,
  type InboxMessage,
} from "@/lib/inbox/queries";
import { cn } from "@/lib/utils";
import { inboxSearchParamsSchema, type RealtimeConversation } from "@/schemas/inbox";
import { createClient } from "@/utils/supabase/client";
import { sendHumanMessage, setBotMode } from "./actions";
import { ChatPanel, ChatPlaceholder, type ChatLoadState } from "./chat-panel";
import { ConversationList } from "./conversation-list";
import { useInboxRealtime } from "./use-inbox-realtime";

type InboxProps = {
  businessId: string;
  timeZone: string;
  initialConversations: InboxConversation[];
  initialSelectedId: string | null;
  initialMessages: InboxMessage[] | null;
};

function withConversation(
  list: readonly InboxConversation[],
  id: string,
  update: (conversation: InboxConversation) => InboxConversation,
): InboxConversation[] {
  return list.map((conversation) => (conversation.id === id ? update(conversation) : conversation));
}

function latest(a: string | null, b: string): string {
  return a && Date.parse(a) > Date.parse(b) ? a : b;
}

export function Inbox({ businessId, timeZone, initialConversations, initialSelectedId, initialMessages }: InboxProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = inboxSearchParamsSchema.parse({ c: searchParams.get("c") ?? undefined }).c ?? null;

  const [conversations, setConversations] = useState(initialConversations);
  const [messagesById, setMessagesById] = useState<Record<string, InboxMessage[]>>(() =>
    initialSelectedId && initialMessages ? { [initialSelectedId]: initialMessages } : {},
  );
  const [loadStates, setLoadStates] = useState<Record<string, ChatLoadState>>(() =>
    initialSelectedId && initialMessages ? { [initialSelectedId]: "ready" } : {},
  );
  const [missingIds, setMissingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [unreadIds, setUnreadIds] = useState<ReadonlySet<string>>(() => new Set());
  const [pendingToggleIds, setPendingToggleIds] = useState<ReadonlySet<string>>(() => new Set());

  // Refs para los callbacks de Realtime, que no deben re-suscribirse en cada render.
  const conversationsRef = useRef(conversations);
  const selectedIdRef = useRef(selectedId);
  const inFlightConversations = useRef(new Set<string>());
  useEffect(() => {
    conversationsRef.current = conversations;
    selectedIdRef.current = selectedId;
  });

  const supabase = useMemo(() => createClient(), []);

  // ------------------------------------------------------------------ carga
  const loadConversation = useCallback(
    async (id: string) => {
      if (inFlightConversations.current.has(id)) return;
      inFlightConversations.current.add(id);
      try {
        const conversation = await fetchConversation(supabase, id);
        if (!conversation) {
          setMissingIds((prev) => new Set(prev).add(id));
          return;
        }
        setConversations((prev) =>
          [...prev.filter((item) => item.id !== id), conversation].sort(compareConversations),
        );
      } catch {
        // Se reintentará en la próxima resincronización.
      } finally {
        inFlightConversations.current.delete(id);
      }
    },
    [supabase],
  );

  // Sin estado registrado = aún no se ha pedido (o se está pidiendo): "loading".
  const selectedLoadState: ChatLoadState | undefined = selectedId ? loadStates[selectedId] : undefined;

  useEffect(() => {
    if (!selectedId || selectedLoadState) return;
    let ignore = false;

    fetchMessages(supabase, selectedId).then(
      (fetched) => {
        if (ignore) return;
        setMessagesById((prev) => ({ ...prev, [selectedId]: mergeMessages(fetched, prev[selectedId] ?? []) }));
        setLoadStates((prev) => ({ ...prev, [selectedId]: "ready" }));
      },
      () => {
        if (!ignore) setLoadStates((prev) => ({ ...prev, [selectedId]: "error" }));
      },
    );
    if (!conversationsRef.current.some((item) => item.id === selectedId)) void loadConversation(selectedId);

    return () => {
      ignore = true;
    };
  }, [selectedId, selectedLoadState, supabase, loadConversation]);

  // --------------------------------------------------------------- mensajes
  const applyMessage = useCallback(
    (message: InboxMessage) => {
      // Se guarda aunque la conversación no se haya cargado: al abrirla, la
      // consulta se fusiona con lo recibido y no se pierde nada en la carrera.
      setMessagesById((prev) => ({
        ...prev,
        [message.conversation_id]: upsertMessage(prev[message.conversation_id] ?? [], message),
      }));

      if (!conversationsRef.current.some((item) => item.id === message.conversation_id)) {
        void loadConversation(message.conversation_id);
        return;
      }

      setConversations((prev) =>
        withConversation(prev, message.conversation_id, (conversation) => {
          const isNewest =
            !conversation.last_message ||
            Date.parse(message.created_at) >= Date.parse(conversation.last_message.created_at);
          return {
            ...conversation,
            last_message_at: latest(conversation.last_message_at, message.created_at),
            last_message: isNewest
              ? { content: message.content, sender_type: message.sender_type, created_at: message.created_at }
              : conversation.last_message,
          };
        }).sort(compareConversations),
      );
    },
    [loadConversation],
  );

  const handleRealtimeMessage = useCallback(
    (message: InboxMessage) => {
      applyMessage(message);
      if (message.sender_type === "customer" && message.conversation_id !== selectedIdRef.current) {
        setUnreadIds((prev) => new Set(prev).add(message.conversation_id));
      }
    },
    [applyMessage],
  );

  const handleRealtimeConversation = useCallback(
    (row: RealtimeConversation) => {
      if (!conversationsRef.current.some((item) => item.id === row.id)) {
        void loadConversation(row.id);
        return;
      }
      setConversations((prev) =>
        withConversation(prev, row.id, (conversation) => ({
          ...conversation,
          channel: row.channel,
          is_bot_active: row.is_bot_active,
          last_message_at: row.last_message_at
            ? latest(conversation.last_message_at, row.last_message_at)
            : conversation.last_message_at,
        })).sort(compareConversations),
      );
    },
    [loadConversation],
  );

  const handleResync = useCallback(async () => {
    try {
      const fresh = await fetchConversations(supabase);
      setConversations(fresh);
    } catch {
      toast.error("No pudimos actualizar la bandeja. Reintentaremos al reconectar.");
    }

    // La conversación abierta se recarga; el resto se volverá a pedir al abrirla.
    const current = selectedIdRef.current;
    setMessagesById((prev) => (current && prev[current] ? { [current]: prev[current] } : {}));
    setLoadStates((prev) => (current && prev[current] ? { [current]: prev[current] } : {}));
    if (current) {
      try {
        const fetched = await fetchMessages(supabase, current);
        setMessagesById((prev) => ({ ...prev, [current]: mergeMessages(fetched, prev[current] ?? []) }));
        setLoadStates((prev) => ({ ...prev, [current]: "ready" }));
      } catch {
        // Se conserva lo que ya estaba en pantalla.
      }
    }
  }, [supabase]);

  const realtimeStatus = useInboxRealtime(businessId, {
    onMessage: handleRealtimeMessage,
    onConversation: handleRealtimeConversation,
    onResync: () => void handleResync(),
  });

  // -------------------------------------------------------------- acciones
  // Borrar el estado de error vuelve a disparar la carga desde el efecto.
  const retryMessages = useCallback((id: string) => {
    setLoadStates((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const selectConversation = useCallback(
    (id: string | null) => {
      if (id) {
        setUnreadIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      // pushState se integra con el router de Next.js: actualiza useSearchParams
      // sin recargar ni volver a renderizar en el servidor.
      window.history.pushState(null, "", id ? `${pathname}?c=${id}` : pathname);
    },
    [pathname],
  );

  const toggleBotMode = useCallback(
    async (id: string, isBotActive: boolean) => {
      const previous = conversationsRef.current.find((item) => item.id === id)?.is_bot_active;
      if (previous === undefined || previous === isBotActive) return;

      setPendingToggleIds((prev) => new Set(prev).add(id));
      setConversations((prev) => withConversation(prev, id, (c) => ({ ...c, is_bot_active: isBotActive })));

      const result = await setBotMode({ conversation_id: id, is_bot_active: isBotActive });

      setPendingToggleIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      if (!result.ok) {
        setConversations((prev) => withConversation(prev, id, (c) => ({ ...c, is_bot_active: previous })));
        toast.error(result.message);
        return;
      }
      toast.success(
        isBotActive ? "El asistente IA vuelve a responder esta conversación." : "Tomaste el control. La IA no responderá.",
      );
    },
    [],
  );

  const sendMessage = useCallback(
    async (id: string, content: string): Promise<boolean> => {
      const result = await sendHumanMessage({ conversation_id: id, content });
      if (!result.ok) {
        toast.error(result.message);
        return false;
      }
      applyMessage(result.data);
      return true;
    },
    [applyMessage],
  );

  // ------------------------------------------------------------------ vista
  const selectedConversation = selectedId ? (conversations.find((item) => item.id === selectedId) ?? null) : null;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <section
        aria-label="Conversaciones"
        className={cn(
          "min-h-0 w-full flex-col border-r md:flex md:w-80 md:shrink-0 xl:w-96",
          selectedId ? "hidden" : "flex",
        )}
      >
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          unreadIds={unreadIds}
          timeZone={timeZone}
          realtimeStatus={realtimeStatus}
          onSelect={selectConversation}
        />
      </section>

      <section
        aria-label="Conversación activa"
        className={cn("min-h-0 min-w-0 flex-1 flex-col md:flex", selectedId ? "flex" : "hidden")}
      >
        {selectedId ? (
          <ChatPanel
            key={selectedId}
            conversationId={selectedId}
            conversation={selectedConversation}
            notFound={missingIds.has(selectedId)}
            messages={selectedLoadState === "ready" ? (messagesById[selectedId] ?? []) : null}
            loadState={selectedLoadState ?? "loading"}
            timeZone={timeZone}
            isTogglePending={pendingToggleIds.has(selectedId)}
            onBack={() => selectConversation(null)}
            onRetry={() => retryMessages(selectedId)}
            onToggleBot={(next) => void toggleBotMode(selectedId, next)}
            onSend={(content) => sendMessage(selectedId, content)}
          />
        ) : (
          <ChatPlaceholder hasConversations={conversations.length > 0} />
        )}
      </section>
    </div>
  );
}
