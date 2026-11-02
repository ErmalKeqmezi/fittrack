import { ClipboardList, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { PlanCard } from "@/features/planner/components/plan-card";
import { TemplateGallery } from "@/features/planner/components/template-gallery";
import { listPlans } from "@/features/planner/queries";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  const plans = await listPlans();

  return (
    <div className="grid gap-8">
      <div className="grid gap-5 lg:gap-6">
        <PageHeader
          title="Workout plans"
          description="Your routines. The active plan decides today's scheduled workout."
          actions={
            <Button asChild className="h-11 rounded-xl px-4">
              <Link href={routes.newPlan}>
                <Plus aria-hidden /> New plan
              </Link>
            </Button>
          }
        />
        {plans.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {plans.map((plan) => (
              <li key={plan.id}>
                <PlanCard plan={plan} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={ClipboardList} title="No plans yet">
            Build your own from scratch, or start from a template below and adjust it. You can also log workouts
            without any plan.
          </EmptyState>
        )}
      </div>

      <section className="grid gap-4" aria-labelledby="templates-heading">
        <div>
          <h2 id="templates-heading" className="text-lg font-semibold">
            Start from a template
          </h2>
          <p className="text-sm text-muted-foreground">
            Optional. A template is copied into a new plan that you can change freely.
          </p>
        </div>
        <TemplateGallery />
      </section>
    </div>
  );
}
