import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { routes } from "@/config/routes";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string | null;
  memberSince: string;
};

/**
 * Data Access Layer entry point. Verifies the session JWT with Supabase and
 * returns a narrow user object. Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, created_at")
    .eq("id", userId)
    .maybeSingle();

  return {
    id: userId,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
    displayName: profile?.display_name ?? null,
    memberSince: profile?.created_at ?? new Date().toISOString(),
  };
});

/** Use in private layouts/pages: returns the user or redirects to login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(routes.login);
  return user;
}

/** True once the owner account exists. Uses a SECURITY DEFINER function that only returns a boolean. */
export async function isSetupComplete(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_setup_complete");
  if (error) throw new Error(`Could not check FitTrack setup state: ${error.message}`);
  return data === true;
}
