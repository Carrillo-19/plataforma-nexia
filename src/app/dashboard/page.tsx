import { BoxesIcon, CalendarDaysIcon, MessagesSquareIcon, UsersIcon, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireMember } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "Resumen" };

type Stat = {
  label: string;
  value: number | null;
  icon: LucideIcon;
};

// Todas las consultas pasan por RLS: sólo cuentan filas del tenant actual.
async function loadStats(): Promise<Stat[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [customers, resources, reservations, conversations] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .gte("start_time", nowIso)
      .in("status", ["pending", "confirmed"]),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
  ]);

  const countOf = (result: { count: number | null; error: unknown }) => (result.error ? null : result.count);

  return [
    { label: "Clientes", value: countOf(customers), icon: UsersIcon },
    { label: "Recursos activos", value: countOf(resources), icon: BoxesIcon },
    { label: "Reservas próximas", value: countOf(reservations), icon: CalendarDaysIcon },
    { label: "Conversaciones", value: countOf(conversations), icon: MessagesSquareIcon },
  ];
}

async function StatsGrid() {
  let stats: Stat[];
  try {
    stats = await loadStats();
  } catch {
    stats = [];
  }

  if (stats.length === 0) {
    return <p className="text-sm text-muted-foreground">No pudimos cargar las métricas. Recarga la página.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <FadeIn key={stat.label} delay={index * 0.04}>
            <Card className="gap-2 transition-shadow duration-200 hover:shadow-md">
              <CardHeader>
                <CardDescription className="flex items-center justify-between">
                  {stat.label}
                  <Icon className="size-4" aria-hidden="true" />
                </CardDescription>
                <CardTitle className="text-3xl tabular-nums">{stat.value ?? "—"}</CardTitle>
              </CardHeader>
            </Card>
          </FadeIn>
        );
      })}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Cargando métricas">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-[104px] rounded-xl" />
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const member = await requireMember();
  const hasPrompt = member.business.ai_prompt_context.trim().length > 0;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {member.business.name}</h1>
        <p className="text-sm text-muted-foreground">Este es el estado de tu negocio hoy.</p>
      </FadeIn>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsGrid />
      </Suspense>

      {!hasPrompt && (
        <FadeIn delay={0.1}>
          <Card className="border-dashed">
            <CardHeader className="gap-3 sm:flex sm:items-center sm:justify-between">
              <div className="grid gap-1">
                <CardTitle>Configura tu asistente de IA</CardTitle>
                <CardDescription>
                  Describe tu negocio, horarios y políticas para que la IA responda como tu equipo.
                </CardDescription>
              </div>
              <Link href="/dashboard/settings" className={cn(buttonVariants(), "shrink-0 active:scale-[0.98]")}>
                Ir a configuración
              </Link>
            </CardHeader>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
