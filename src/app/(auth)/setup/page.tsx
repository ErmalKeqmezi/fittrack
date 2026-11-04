import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SetupForm } from "@/features/auth/components/setup-form";
import { getCurrentUser, isSetupComplete } from "@/features/auth/queries";

export const metadata: Metadata = { title: "Set up" };

export default async function SetupPage() {
  // Public registration is only available until the first account exists.
  if (await getCurrentUser()) redirect(routes.dashboard);
  if (await isSetupComplete()) redirect(routes.login);

  return (
    <AuthCard
      title="Set up FitTrack"
      description="Create your account. Public registration closes once it exists."
    >
      <SetupForm />
    </AuthCard>
  );
}
