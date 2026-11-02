import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/features/auth/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const memberSince = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(
    new Date(user.memberSince),
  );

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          Hi{user.displayName ? `, ${user.displayName}` : ""} 👋
        </h1>
      </div>

      <Card className="rounded-2xl border border-border ring-0">
        <CardHeader>
          <CardTitle>Your journal is ready</CardTitle>
          <CardDescription>
            Account created on {memberSince}. The dashboard, exercise library, planner and workout
            tracker arrive in the next phases.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
