"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  BotIcon,
  HandIcon,
  Loader2Icon,
  MessageCircleIcon,
  MessagesSquareIcon,
  PhoneIcon,
  RotateCwIcon,
  SendHorizontalIcon,
  UserRoundIcon,
} from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CHANNEL_LABELS,
  SENDER_LABELS,
  customerDisplayName,
  customerInitials,
  formatDayDivider,
  formatMessageTime,
  isSameDay,
} from "@/lib/inbox/format";
import type { InboxConversation, InboxMessage } from "@/lib/inbox/queries";
import { cn } from "@/lib/utils";
import { MESSAGE_MAX_LENGTH } from "@/schemas/message";

export type ChatLoadState = "loading" | "ready" | "error";

// Distancia (px) al final bajo la cual se considera que el usuario "está abajo".
const STICKY_BOTTOM_THRESHOLD = 120;

type ChatPanelProps = {
  conversationId: string;
  conversation: InboxConversation | null;
  notFound: boolean;
  messages: InboxMessage[] | null;
  loadState: ChatLoadState;
  timeZone: string;
  isTogglePending: boolean;
  onBack: () => void;
  onRetry: () => void;
  onToggleBot: (isBotActive: boolean) => void;
  onSend: (content: string) => Promise<boolean>;
};

export function ChatPanel({
  conversationId,
  conversation,
  notFound,
  messages,
  loadState,
  timeZone,
  isTogglePending,
  onBack,
  onRetry,
  onToggleBot,
  onSend,
}: ChatPanelProps) {
  if (notFound) {
    return (
      <div className="flex flex-1 flex-col">
        <MobileBackBar onBack={onBack} />
        <EmptyState
          icon={AlertTriangleIcon}
          title="Conversación no encontrada"
          description="Puede que se haya eliminado o que no pertenezca a tu negocio."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatHeader
        conversation={conversation}
        isTogglePending={isTogglePending}
        onBack={onBack}
        onToggleBot={onToggleBot}
      />

      {conversation && !conversation.is_bot_active && (
        <div className="flex items-center gap-2 border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-300">
          <HandIcon className="size-3.5 shrink-0" aria-hidden="true" />
          Intervención humana activa: la IA no responderá en esta conversación.
        </div>
      )}

      <MessageList
        key={conversationId}
        messages={messages}
        loadState={loadState}
        timeZone={timeZone}
        onRetry={onRetry}
      />

      <Composer
        conversationId={conversationId}
        conversation={conversation}
        isTogglePending={isTogglePending}
        onTakeOver={() => onToggleBot(false)}
        onSend={onSend}
      />
    </div>
  );
}

// ---------------------------------------------------------------- encabezado

function MobileBackBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-14 items-center border-b px-2 md:hidden">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeftIcon aria-hidden="true" />
        Conversaciones
      </Button>
    </div>
  );
}

type ChatHeaderProps = {
  conversation: InboxConversation | null;
  isTogglePending: boolean;
  onBack: () => void;
  onToggleBot: (isBotActive: boolean) => void;
};

function ChatHeader({ conversation, isTogglePending, onBack, onToggleBot }: ChatHeaderProps) {
  const ChannelIcon = conversation?.channel === "voice" ? PhoneIcon : MessageCircleIcon;

  return (
    <header className="flex min-h-16 items-center gap-3 border-b px-3 py-2 sm:px-4">
      <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden" aria-label="Volver a conversaciones">
        <ArrowLeftIcon aria-hidden="true" />
      </Button>

      {conversation ? (
        <>
          <Avatar className="size-9">
            <AvatarFallback className="text-xs font-medium">{customerInitials(conversation.customer)}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">{customerDisplayName(conversation.customer)}</h2>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <ChannelIcon className="size-3 shrink-0" aria-hidden="true" />
              {CHANNEL_LABELS[conversation.channel]}
              {conversation.customer?.full_name && <> · {conversation.customer.phone_number}</>}
            </p>
          </div>
          <BotModeToggle
            isBotActive={conversation.is_bot_active}
            isPending={isTogglePending}
            onChange={onToggleBot}
          />
        </>
      ) : (
        <div className="flex flex-1 items-center gap-3" aria-busy="true" aria-label="Cargando conversación">
          <Skeleton className="size-9 rounded-full" />
          <div className="grid gap-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      )}
    </header>
  );
}

type BotModeToggleProps = {
  isBotActive: boolean;
  isPending: boolean;
  onChange: (isBotActive: boolean) => void;
};

function BotModeToggle({ isBotActive, isPending, onChange }: BotModeToggleProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 transition-colors duration-200",
        isBotActive ? "border-primary/20 bg-primary/5" : "border-amber-500/40 bg-amber-500/10",
      )}
    >
      {isPending ? (
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : isBotActive ? (
        <BotIcon className="size-4" aria-hidden="true" />
      ) : (
        <UserRoundIcon className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      )}
      <Label htmlFor="bot-mode-toggle" className="cursor-pointer text-xs font-medium whitespace-nowrap">
        <span className="hidden sm:inline">{isBotActive ? "Modo Bot" : "Intervención humana"}</span>
        <span className="sm:hidden">{isBotActive ? "Bot" : "Humano"}</span>
      </Label>
      <Switch
        id="bot-mode-toggle"
        checked={isBotActive}
        disabled={isPending}
        onCheckedChange={onChange}
        aria-label={isBotActive ? "Desactivar el bot e intervenir manualmente" : "Reactivar el bot de IA"}
      />
    </div>
  );
}

// ----------------------------------------------------------------- mensajes

type MessageListProps = {
  messages: InboxMessage[] | null;
  loadState: ChatLoadState;
  timeZone: string;
  onRetry: () => void;
};

function MessageList({ messages, loadState, timeZone, onRetry }: MessageListProps) {
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);
  const [hasUnseen, setHasUnseen] = useState(false);

  const lastMessage = messages?.at(-1) ?? null;

  // Al abrir la conversación se salta al final; con mensajes nuevos se sigue
  // bajando sólo si el usuario ya estaba abajo (o si el mensaje es suyo).
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || !lastMessage || lastMessage.id === lastMessageIdRef.current) return;

    const isFirstRender = lastMessageIdRef.current === null;
    lastMessageIdRef.current = lastMessage.id;

    if (isFirstRender || isAtBottomRef.current || lastMessage.sender_type === "human_admin") {
      element.scrollTo({ top: element.scrollHeight, behavior: isFirstRender || reduceMotion ? "auto" : "smooth" });
      isAtBottomRef.current = true;
    } else {
      setHasUnseen(true);
    }
  }, [lastMessage, reduceMotion]);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < STICKY_BOTTOM_THRESHOLD;
    isAtBottomRef.current = atBottom;
    if (atBottom && hasUnseen) setHasUnseen(false);
  }

  function scrollToBottom() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
    setHasUnseen(false);
  }

  if (!messages) {
    if (loadState === "error") {
      return (
        <EmptyState
          icon={AlertTriangleIcon}
          title="No pudimos cargar los mensajes"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
              <RotateCwIcon aria-hidden="true" />
              Reintentar
            </Button>
          }
        />
      );
    }
    return <MessagesSkeleton />;
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto bg-muted/30 px-3 py-4 sm:px-6"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Mensajes"
      >
        {messages.length === 0 ? (
          <EmptyState
            icon={MessagesSquareIcon}
            title="Sin mensajes"
            description="Los mensajes de esta conversación aparecerán aquí en tiempo real."
          />
        ) : (
          <ol className="mx-auto grid max-w-3xl gap-1.5">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const showDivider = !previous || !isSameDay(previous.created_at, message.created_at, timeZone);
                const groupedWithPrevious =
                  !showDivider && previous?.sender_type === message.sender_type;

                return (
                  <Fragment key={message.id}>
                    {showDivider && (
                      <li className="my-3 flex justify-center" aria-hidden="true">
                        <span
                          suppressHydrationWarning
                          className="rounded-full bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground capitalize shadow-xs"
                        >
                          {formatDayDivider(message.created_at, timeZone)}
                        </span>
                      </li>
                    )}
                    <motion.li
                      initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className={cn(!groupedWithPrevious && "mt-2")}
                    >
                      <MessageBubble message={message} timeZone={timeZone} showSender={!groupedWithPrevious} />
                    </motion.li>
                  </Fragment>
                );
              })}
            </AnimatePresence>
          </ol>
        )}
      </div>

      <AnimatePresence>
        {hasUnseen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2"
          >
            <Button size="sm" onClick={scrollToBottom} className="gap-1.5 rounded-full shadow-md">
              <ArrowDownIcon aria-hidden="true" />
              Nuevos mensajes
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({
  message,
  timeZone,
  showSender,
}: {
  message: InboxMessage;
  timeZone: string;
  showSender: boolean;
}) {
  const isCustomer = message.sender_type === "customer";
  const isAi = message.sender_type === "ai";

  return (
    <div className={cn("flex flex-col gap-1", isCustomer ? "items-start" : "items-end")}>
      {showSender && (
        <span className="flex items-center gap-1 px-1 text-[11px] font-medium text-muted-foreground">
          {isAi && <BotIcon className="size-3" aria-hidden="true" />}
          {message.sender_type === "human_admin" && <UserRoundIcon className="size-3" aria-hidden="true" />}
          {SENDER_LABELS[message.sender_type]}
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-xs sm:max-w-[70%]",
          isCustomer && "rounded-tl-sm border bg-background",
          isAi && "rounded-tr-sm border border-primary/15 bg-primary/5",
          message.sender_type === "human_admin" && "rounded-tr-sm bg-primary text-primary-foreground",
        )}
      >
        <p className="break-words whitespace-pre-wrap">{message.content}</p>
        <time
          dateTime={message.created_at}
          suppressHydrationWarning
          className={cn(
            "mt-1 block text-right text-[10px] tabular-nums",
            message.sender_type === "human_admin" ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {formatMessageTime(message.created_at, timeZone)}
        </time>
      </div>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="flex-1 bg-muted/30 px-3 py-4 sm:px-6" aria-busy="true" aria-label="Cargando mensajes">
      <div className="mx-auto grid max-w-3xl gap-4">
        {[60, 45, 70, 35, 55].map((width, index) => (
          <Skeleton
            key={index}
            className={cn("h-12 rounded-2xl", index % 2 === 0 ? "justify-self-start" : "justify-self-end")}
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ composer

type ComposerProps = {
  conversationId: string;
  conversation: InboxConversation | null;
  isTogglePending: boolean;
  onTakeOver: () => void;
  onSend: (content: string) => Promise<boolean>;
};

function Composer({ conversationId, conversation, isTogglePending, onTakeOver, onSend }: ComposerProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isHumanMode = conversation ? !conversation.is_bot_active : false;

  // Al tomar el control, el cursor queda listo para escribir.
  useEffect(() => {
    if (isHumanMode) textareaRef.current?.focus();
  }, [isHumanMode]);

  if (!conversation) return <div className="h-[72px] border-t" aria-hidden="true" />;

  if (!isHumanMode) {
    return (
      <div className="flex flex-col items-center justify-between gap-3 border-t bg-background px-4 py-3 sm:flex-row">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <BotIcon className="size-4 shrink-0" aria-hidden="true" />
          El asistente IA está atendiendo esta conversación.
        </p>
        <Button onClick={onTakeOver} disabled={isTogglePending} className="w-full gap-2 active:scale-[0.98] sm:w-auto">
          {isTogglePending ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : <HandIcon aria-hidden="true" />}
          Intervenir
        </Button>
      </div>
    );
  }

  const trimmed = draft.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= MESSAGE_MAX_LENGTH && !sending;
  const nearLimit = draft.length > MESSAGE_MAX_LENGTH * 0.9;

  async function submit() {
    if (!canSend) return;
    setSending(true);
    const sent = await onSend(trimmed);
    setSending(false);
    if (sent) setDraft("");
    textareaRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envía; Shift+Enter hace salto de línea. Se respeta la composición IME.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form
      className="border-t bg-background px-3 py-3 sm:px-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <Label htmlFor={`composer-${conversationId}`} className="sr-only">
          Escribe un mensaje
        </Label>
        <Textarea
          id={`composer-${conversationId}`}
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe una respuesta…"
          maxLength={MESSAGE_MAX_LENGTH}
          rows={1}
          disabled={sending}
          className="max-h-40 min-h-10 resize-none"
          aria-describedby={nearLimit ? `composer-${conversationId}-count` : undefined}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className="size-10 shrink-0 transition-transform duration-200 active:scale-95"
        >
          {sending ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : <SendHorizontalIcon aria-hidden="true" />}
        </Button>
      </div>
      <div className="mx-auto mt-1.5 flex max-w-3xl justify-between text-[11px] text-muted-foreground">
        <span>Enter para enviar · Shift + Enter para nueva línea</span>
        {nearLimit && (
          <span id={`composer-${conversationId}-count`} className="tabular-nums text-destructive">
            {draft.length.toLocaleString("es")} / {MESSAGE_MAX_LENGTH.toLocaleString("es")}
          </span>
        )}
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ vacíos

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof MessagesSquareIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <Icon className="size-10 text-muted-foreground/50" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ChatPlaceholder({ hasConversations }: { hasConversations: boolean }) {
  return (
    <EmptyState
      icon={MessagesSquareIcon}
      title={hasConversations ? "Selecciona una conversación" : "Tu bandeja está lista"}
      description={
        hasConversations
          ? "Elige un chat de la lista para leerlo, responder o tomar el control del asistente IA."
          : "Las conversaciones de WhatsApp y voz aparecerán aquí en tiempo real."
      }
    />
  );
}
