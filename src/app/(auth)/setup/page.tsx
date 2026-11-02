import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SetupForm } from "@/features/auth/components/setup-form";
import { isSetupComplete } from "@/features/auth/queries";

export const metadata: Metadata = { title: "Set up" };

export default async function SetupPage() {
  // Registration is only available until the owner account exists.
  if (await isSetupComplete()) redirect(routes.login);

  return (
    <AuthCard
      title="Set up FitTrack"
      description="Create the single owner account. Registration closes once this account exists."
    >
      <SetupForm />
    </AuthCard>
  );
}
