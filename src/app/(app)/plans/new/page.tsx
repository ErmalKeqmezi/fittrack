import type { Metadata } from "next";

import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/panel";
import { routes } from "@/config/routes";
import { createPlan } from "@/features/planner/actions";
import { PlanDetailsForm } from "@/features/planner/components/plan-details-form";

export const metadata: Metadata = { title: "New plan" };

export default function NewPlanPage() {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5 lg:mx-0 lg:gap-6">
      <BackLink href={routes.plans}>Workout plans</BackLink>
      <PageHeader title="New plan" description="Name it now; add training days and exercises next." />
      <Panel>
        <PlanDetailsForm action={createPlan} submitLabel="Create plan" cancelHref={routes.plans} />
      </Panel>
    </div>
  );
}
