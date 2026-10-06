import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { Enums, Tables } from "@/types/database.types";
import { createClient } from "@/utils/supabase/server";

export type SessionUser = {
  id: string;
  email: string | null;
};

export type CurrentMember = {
  user: SessionUser;
  role: Enums<"user_role">;
  business: Pick<Tables<"businesses">, "id" | "name" | "industry_type" | "timezone" | "ai_prompt_context">;
};

// Data Access Layer: única fuente de verdad de identidad y tenant en el
// servidor. `cache` deduplica las consultas dentro de un mismo render.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims.sub) return null;

    const email = typeof data.claims.email === "string" ? data.claims.email : null;
    return { id: data.claims.sub, email };
  } catch {
    return null;
  }
});

export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("role, business:businesses(id, name, industry_type, timezone, ai_prompt_context)")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[dal] Failed to load member profile", { code: error.code });
      return null;
    }
    if (!data?.business) return null;

    return { user, role: data.role, business: data.business };
  } catch (error) {
    console.error("[dal] Unexpected error loading member profile", error instanceof Error ? error.name : "unknown");
    return null;
  }
});

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireMember(): Promise<CurrentMember> {
  await requireSessionUser();
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");
  return member;
}

export function canManageBusiness(role: Enums<"user_role">): boolean {
  return role === "owner" || role === "admin";
}
