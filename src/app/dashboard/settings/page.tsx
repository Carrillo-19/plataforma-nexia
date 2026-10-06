import type { Metadata } from "next";

import { FadeIn } from "@/components/motion/fade-in";
import { canManageBusiness, requireMember } from "@/lib/auth/dal";
import { getTimezoneOptions } from "@/lib/business-options";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const member = await requireMember();
  const { business } = member;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">Datos de tu negocio y contexto que usará tu asistente de IA.</p>
      </FadeIn>

      <FadeIn delay={0.05}>
        <SettingsForm
          timezones={getTimezoneOptions()}
          canEdit={canManageBusiness(member.role)}
          defaults={{
            business_name: business.name,
            industry_type: business.industry_type,
            timezone: business.timezone,
            ai_prompt_context: business.ai_prompt_context,
          }}
        />
      </FadeIn>
    </div>
  );
}
