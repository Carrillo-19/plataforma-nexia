import type { Metadata } from "next";

import { requireMember } from "@/lib/auth/dal";
import { fetchConversations, fetchMessages, InboxQueryError } from "@/lib/inbox/queries";
import { inboxSearchParamsSchema } from "@/schemas/inbox";
import { createClient } from "@/utils/supabase/server";
import { Inbox } from "./inbox";

export const metadata: Metadata = { title: "Bandeja" };

type InboxPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const member = await requireMember();
  const { c: selectedId = null } = inboxSearchParamsSchema.parse(await searchParams);

  let data: Awaited<ReturnType<typeof loadInbox>>;
  try {
    data = await loadInbox(selectedId);
  } catch (error) {
    console.error("[inbox] initial load failed", error instanceof InboxQueryError ? { code: error.code } : "unknown");
    return (
      <div className="mx-auto grid max-w-md gap-1 py-16 text-center">
        <p className="text-sm font-medium">No pudimos cargar la bandeja</p>
        <p className="text-sm text-muted-foreground">Recarga la página en unos segundos.</p>
      </div>
    );
  }

  return (
    // Ocupa todo el alto bajo el header del dashboard (h-14) sin el padding del <main>.
    <div className="-mx-4 -my-6 h-[calc(100svh-3.5rem)] sm:-mx-6 lg:-mx-8">
      <Inbox
        businessId={member.business.id}
        timeZone={member.business.timezone}
        initialConversations={data.conversations}
        initialSelectedId={selectedId}
        initialMessages={data.messages}
      />
    </div>
  );
}

async function loadInbox(selectedId: string | null) {
  const supabase = await createClient();
  const [conversations, messages] = await Promise.all([
    fetchConversations(supabase),
    selectedId ? fetchMessages(supabase, selectedId) : Promise.resolve(null),
  ]);
  return { conversations, messages };
}
