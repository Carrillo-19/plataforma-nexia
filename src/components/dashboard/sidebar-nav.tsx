"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BoxesIcon,
  CalendarDaysIcon,
  InboxIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Rutas de fases futuras: se muestran deshabilitadas en lugar de dar 404.
  comingSoon?: boolean;
  exact?: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboardIcon, exact: true },
  { href: "/dashboard/inbox", label: "Bandeja", icon: InboxIcon, comingSoon: true },
  { href: "/dashboard/reservations", label: "Reservas", icon: CalendarDaysIcon, comingSoon: true },
  { href: "/dashboard/customers", label: "Clientes", icon: UsersIcon, comingSoon: true },
  { href: "/dashboard/resources", label: "Recursos", icon: BoxesIcon, comingSoon: true },
  { href: "/dashboard/settings", label: "Configuración", icon: SettingsIcon },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type SidebarNavProps = {
  // Identificador único por instancia (desktop / móvil) para la animación del indicador.
  layoutGroupId: string;
  onNavigate?: () => void;
};

export function SidebarNav({ layoutGroupId, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <nav aria-label="Navegación principal" className="grid gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;

        if (item.comingSoon) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              className="flex h-9 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground/45"
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
              <Badge variant="outline" className="ml-auto px-1.5 text-[10px] font-normal">
                Pronto
              </Badge>
            </span>
          );
        }

        const active = isActive(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors duration-200",
              "focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50 active:scale-[0.98]",
              active
                ? "text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`${layoutGroupId}-active`}
                className="absolute inset-0 rounded-md bg-sidebar-accent"
                transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
                aria-hidden="true"
              />
            )}
            <Icon className="relative size-4" aria-hidden="true" />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
