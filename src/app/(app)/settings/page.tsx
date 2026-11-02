import { ShieldCheck, UserRound } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader } from "@/components/panel";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/features/auth/queries";
import { ProfileForm } from "@/features/profile/components/profile-form";

export const metadata: Metadata = { title: "Settings" };

function timeZoneOptions(current: string) {
  // supportedValuesOf omits "UTC", which is the default for new profiles.
  const zones = ["UTC", ...Intl.supportedValuesOf("timeZone").filter((tz) => tz !== "UTC")];
  return zones.includes(current) ? zones : [current, ...zones];
}

export default async function SettingsPage() {
  const user = await requireUser();
  const memberSince = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: user.timeZone }).format(
    new Date(user.memberSince),
  );

  return (
    <div className="mx-auto grid max-w-2xl gap-5 lg:mx-0 lg:gap-6">
      <PageHeader title="Settings" description="Your profile and account" />

      <Panel>
        <PanelHeader title="Profile" icon={UserRound} />
        <ProfileForm displayName={user.displayName} timeZone={user.timeZone} timeZones={timeZoneOptions(user.timeZone)} />
      </Panel>

      <Panel>
        <PanelHeader title="Account" icon={ShieldCheck} description="Private owner account" />
        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate font-medium">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="font-medium">{memberSince}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Units</dt>
            <dd className="font-medium">Kilograms</dd>
          </div>
        </dl>
        <div className="mt-5 border-t border-border pt-4">
          <SignOutButton />
        </div>
      </Panel>
    </div>
  );
}
