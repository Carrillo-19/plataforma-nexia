import type { Enums } from "@/types/database.types";
import type { TypedSupabaseClient } from "@/utils/supabase/client";

// Consultas de la bandeja compartidas por el servidor (render inicial) y el
// navegador (Realtime / resincronización). Ambos clientes usan la sesión del
// usuario, así que RLS limita todo al business_id del miembro.

export const CONVERSATIONS_PAGE_SIZE = 100;
export const MESSAGES_PAGE_SIZE = 200;

export type InboxMessage = {
  id: string;
  conversation_id: string;
  sender_type: Enums<"message_sender_type">;
  content: string;
  created_at: string;
};

export type InboxConversation = {
  id: string;
  channel: Enums<"conversation_channel">;
  is_bot_active: boolean;
  last_message_at: string | null;
  created_at: string;
  customer: {
    id: string;
    full_name: string | null;
    phone_number: string;
  } | null;
  last_message: Pick<InboxMessage, "content" | "sender_type" | "created_at"> | null;
};

const CONVERSATION_COLUMNS =
  "id, channel, is_bot_active, last_message_at, created_at, customer:customers(id, full_name, phone_number), messages(content, sender_type, created_at)";

const MESSAGE_COLUMNS = "id, conversation_id, sender_type, content, created_at";

function selectConversations(supabase: TypedSupabaseClient) {
  return supabase
    .from("conversations")
    .select(CONVERSATION_COLUMNS)
    // Sólo el último mensaje de cada conversación, para la vista previa.
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" });
}

type ConversationRow = NonNullable<Awaited<ReturnType<typeof selectConversations>>["data"]>[number];

function toInboxConversation(row: ConversationRow): InboxConversation {
  return {
    id: row.id,
    channel: row.channel,
    is_bot_active: row.is_bot_active,
    last_message_at: row.last_message_at,
    created_at: row.created_at,
    customer: row.customer,
    last_message: row.messages[0] ?? null,
  };
}

export function compareConversations(a: InboxConversation, b: InboxConversation): number {
  const aTime = Date.parse(a.last_message_at ?? a.created_at);
  const bTime = Date.parse(b.last_message_at ?? b.created_at);
  return bTime - aTime;
}

export async function fetchConversations(supabase: TypedSupabaseClient): Promise<InboxConversation[]> {
  const { data, error } = await selectConversations(supabase)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(CONVERSATIONS_PAGE_SIZE);

  if (error) throw new InboxQueryError("conversations", error.code);
  return data.map(toInboxConversation);
}

export async function fetchConversation(
  supabase: TypedSupabaseClient,
  conversationId: string,
): Promise<InboxConversation | null> {
  const { data, error } = await selectConversations(supabase).eq("id", conversationId).maybeSingle();

  if (error) throw new InboxQueryError("conversation", error.code);
  return data ? toInboxConversation(data) : null;
}

export async function fetchMessages(supabase: TypedSupabaseClient, conversationId: string): Promise<InboxMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGES_PAGE_SIZE);

  if (error) throw new InboxQueryError("messages", error.code);
  return data.reverse();
}

// Error sin detalles de Postgres: sólo el recurso y el código para los logs.
export class InboxQueryError extends Error {
  constructor(
    readonly resource: string,
    readonly code: string | undefined,
  ) {
    super(`Failed to load ${resource}`);
    this.name = "InboxQueryError";
  }
}

// Inserta (o reemplaza) un mensaje manteniendo el orden cronológico. Idempotente:
// el mismo mensaje puede llegar por la Server Action y por Realtime.
export function upsertMessage(list: readonly InboxMessage[], message: InboxMessage): InboxMessage[] {
  const withoutDuplicate = list.filter((item) => item.id !== message.id);
  const time = Date.parse(message.created_at);
  let index = withoutDuplicate.length;
  while (index > 0 && Date.parse(withoutDuplicate[index - 1].created_at) > time) index -= 1;
  return [...withoutDuplicate.slice(0, index), message, ...withoutDuplicate.slice(index)];
}

// Une dos listas de mensajes sin duplicados, en orden cronológico.
export function mergeMessages(a: readonly InboxMessage[], b: readonly InboxMessage[]): InboxMessage[] {
  const byId = new Map<string, InboxMessage>();
  for (const message of a) byId.set(message.id, message);
  for (const message of b) byId.set(message.id, message);
  return [...byId.values()].sort((x, y) => Date.parse(x.created_at) - Date.parse(y.created_at));
}
