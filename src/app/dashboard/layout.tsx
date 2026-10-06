import type { ReactNode } from "react";

import { MobileNav } from "@/components/dashboard/mobile-nav";
import { SidebarContent } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireMember } from "@/lib/auth/dal";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Segunda barrera tras proxy.ts: sesión válida + perfil de tenant.
  const member = await requireMember();

  return (
    <div className="flex min-h-svh flex-1">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
        <SidebarContent member={member} layoutGroupId="desktop-nav" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
          <MobileNav>
            <SidebarContent member={member} layoutGroupId="mobile-nav" />
          </MobileNav>
          <p className="truncate text-sm font-medium lg:hidden">{member.business.name}</p>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
