"use client";

import { BotIcon, InboxIcon, MessageCircleIcon, PhoneIcon, SearchIcon, UserRoundIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  CHANNEL_LABELS,
  customerDisplayName,
  customerInitials,
  formatListTime,
} from "@/lib/inbox/format";
import type { InboxConversation } from "@/lib/inbox/queries";
import { cn } from "@/lib/utils";
import type { RealtimeStatus } from "./use-inbox-realtime";

type ModeFilter = "all" | "bot" | "human";

const FILTERS: readonly { value: ModeFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "bot", label: "Bot IA" },
  { value: "human", label: "Humano" },
];

const PREVIEW_PREFIX: Record<NonNullable<InboxConversation["last_message"]>["sender_type"], string> = {
  customer: "",
  ai: "IA: ",
  human_admin: "Tú: ",
};

const STATUS_COPY: Record<RealtimeStatus, { label: string; className: string }> = {
  connecting: { label: "Conectando…", className: "bg-amber-500 animate-pulse" },
  live: { label: "En vivo", className: "bg-emerald-500" },
  reconnecting: { label: "Reconectando…", className: "bg-amber-500 animate-pulse" },
  offline: { label: "Sin conexión", className: "bg-destructive" },
};

type ConversationListProps = {
  conversations: InboxConversation[];
  selectedId: string | null;
  unreadIds: ReadonlySet<string>;
  timeZone: string;
  realtimeStatus: RealtimeStatus;
  onSelect: (id: string) => void;
};

export function ConversationList({
  conversations,
  selectedId,
  unreadIds,
  timeZone,
  realtimeStatus,
  onSelect,
}: ConversationListProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ModeFilter>("all");
  const deferredQuery = useDeferredValue(query);

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (mode === "bot" && !conversation.is_bot_active) return false;
      if (mode === "human" && conversation.is_bot_active) return false;
      if (!needle) return true;
      const name = conversation.customer?.full_name?.toLowerCase() ?? "";
      const phone = conversation.customer?.phone_number ?? "";
      return name.includes(needle) || phone.includes(needle);
    });
  }, [conversations, deferredQuery, mode]);

  const status = STATUS_COPY[realtimeStatus];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-3 border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Bandeja</h1>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status" aria-live="polite">
            <span className={cn("size-2 rounded-full", status.className)} aria-hidden="true" />
            {status.label}
          </span>
        </div>

        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Buscar por nombre o teléfono"
            aria-label="Buscar conversaciones"
            className="pl-8"
            maxLength={120}
          />
        </div>

        <div role="group" aria-label="Filtrar por modo" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={mode === filter.value}
              onClick={() => setMode(filter.value)}
              className={cn(
                "h-7 rounded-md text-xs font-medium outline-none transition-colors duration-200",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]",
                mode === filter.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <InboxIcon className="size-8 text-muted-foreground/60" aria-hidden="true" />
            <p className="text-sm font-medium">
              {conversations.length === 0 ? "Aún no hay conversaciones" : "Sin resultados"}
            </p>
            <p className="text-xs text-muted-foreground">
              {conversations.length === 0
                ? "Cuando tus clientes escriban por WhatsApp o llamen, aparecerán aquí al instante."
                : "Prueba con otro nombre, teléfono o filtro."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-0.5 p-2">
            {visible.map((conversation) => (
              <li key={conversation.id}>
                <ConversationRow
                  conversation={conversation}
                  selected={conversation.id === selectedId}
                  unread={unreadIds.has(conversation.id)}
                  timeZone={timeZone}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type ConversationRowProps = {
  conversation: InboxConversation;
  selected: boolean;
  unread: boolean;
  timeZone: string;
  onSelect: (id: string) => void;
};

function ConversationRow({ conversation, selected, unread, timeZone, onSelect }: ConversationRowProps) {
  const ChannelIcon = conversation.channel === "voice" ? PhoneIcon : MessageCircleIcon;
  const timestamp = conversation.last_message?.created_at ?? conversation.last_message_at ?? conversation.created_at;
  const preview = conversation.last_message
    ? `${PREVIEW_PREFIX[conversation.last_message.sender_type]}${conversation.last_message.content}`
    : "Sin mensajes todavía";

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition-colors duration-200",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.99]",
        selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
      )}
    >
      <Avatar className="mt-0.5 size-10">
        <AvatarFallback className="text-xs font-medium">{customerInitials(conversation.customer)}</AvatarFallback>
      </Avatar>

      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex items-center gap-2">
          <span className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>
            {customerDisplayName(conversation.customer)}
          </span>
          <time
            dateTime={timestamp}
            suppressHydrationWarning
            className={cn("ml-auto shrink-0 text-xs tabular-nums", unread ? "text-foreground" : "text-muted-foreground")}
          >
            {formatListTime(timestamp, timeZone)}
          </time>
        </span>

        <span className="flex items-center gap-2">
          <span className={cn("truncate text-xs", unread ? "text-foreground" : "text-muted-foreground")}>{preview}</span>
          {unread && <span className="ml-auto size-2 shrink-0 rounded-full bg-primary" aria-label="Mensajes nuevos" />}
        </span>

        <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <ChannelIcon className="size-3" aria-hidden="true" />
            {CHANNEL_LABELS[conversation.channel]}
          </span>
          <span aria-hidden="true">·</span>
          {conversation.is_bot_active ? (
            <span className="flex items-center gap-1">
              <BotIcon className="size-3" aria-hidden="true" />
              Bot IA
            </span>
          ) : (
            <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
              <UserRoundIcon className="size-3" aria-hidden="true" />
              Humano
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
