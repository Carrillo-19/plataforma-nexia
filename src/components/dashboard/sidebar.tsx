import { BotIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";

import { SubmitButton } from "@/components/forms/submit-button";
import { logout } from "@/lib/auth/actions";
import { INDUSTRY_LABELS, ROLE_LABELS } from "@/lib/business-options";
import type { CurrentMember } from "@/lib/auth/dal";
import { SidebarNav } from "./sidebar-nav";

type SidebarContentProps = {
  member: CurrentMember;
  layoutGroupId: string;
  onNavigate?: () => void;
};

export function SidebarBrand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 rounded-md px-1 font-semibold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <BotIcon className="size-4" aria-hidden="true" />
      </span>
      OmniAI
    </Link>
  );
}

export function SidebarContent({ member, layoutGroupId, onNavigate }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <SidebarBrand />

      <div className="rounded-lg border border-sidebar-border bg-background/50 px-3 py-2.5">
        <p className="truncate text-sm font-medium" title={member.business.name}>
          {member.business.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {INDUSTRY_LABELS[member.business.industry_type]} · {ROLE_LABELS[member.role]}
        </p>
      </div>

      <SidebarNav layoutGroupId={layoutGroupId} onNavigate={onNavigate} />

      <div className="mt-auto grid gap-2 border-t border-sidebar-border pt-4">
        {member.user.email && (
          <p className="truncate px-1 text-xs text-muted-foreground" title={member.user.email}>
            {member.user.email}
          </p>
        )}
        <form action={logout}>
          <SubmitButton variant="ghost" className="w-full justify-start gap-3 px-3" pendingLabel="Saliendo…">
            <LogOutIcon className="size-4" aria-hidden="true" />
            Cerrar sesión
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
