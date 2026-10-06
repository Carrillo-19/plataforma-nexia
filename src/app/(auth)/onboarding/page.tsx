import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentMember, requireSessionUser } from "@/lib/auth/dal";
import { getTimezoneOptions } from "@/lib/business-options";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Configura tu negocio" };

export default async function OnboardingPage() {
  await requireSessionUser();
  if (await getCurrentMember()) redirect("/dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Configura tu negocio</CardTitle>
        <CardDescription>Un último paso antes de entrar a tu panel.</CardDescription>
      </CardHeader>
      <CardContent>
        <OnboardingForm timezones={getTimezoneOptions()} />
      </CardContent>
    </Card>
  );
}
