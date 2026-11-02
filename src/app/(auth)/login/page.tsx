import type { Metadata } from "next";
import Link from "next/link";

import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";
import { isSetupComplete } from "@/features/auth/queries";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in" };

const notices: Record<string, string> = {
  confirmation_failed: "That confirmation link is invalid or has expired.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const setupComplete = await isSetupComplete();
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  const notice = typeof params.error === "string" ? notices[params.error] : undefined;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your private gym journal."
      footer={
        setupComplete ? null : (
          <>
            First time here?{" "}
            <Link href={routes.setup} className="font-medium text-primary hover:underline">
              Set up FitTrack
            </Link>
          </>
        )
      }
    >
      <LoginForm next={next} notice={notice} />
    </AuthCard>
  );
}
