import { Database, ShieldCheck, Timer, UserRound } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader } from "@/components/panel";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/features/auth/queries";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { RestAlertSettings } from "@/features/workouts/components/rest-alert-settings";

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
        <PanelHeader title="Rest timer" description="Saved on this device" icon={Timer} />
        <RestAlertSettings />
      </Panel>

      <Panel>
        <PanelHeader title="Your data" description="Download a copy of everything you've logged" icon={Database} />
        <div className="grid gap-2 sm:grid-cols-2">
          <a
            href="/api/export?format=csv"
            download
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border text-sm font-medium transition-colors hover:bg-secondary active:bg-secondary"
          >
            Workouts spreadsheet (CSV)
          </a>
          <a
            href="/api/export?format=json"
            download
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border text-sm font-medium transition-colors hover:bg-secondary active:bg-secondary"
          >
            Full backup (JSON)
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          CSV has one row per completed set and opens in Excel or Google Sheets. JSON also includes your plans, custom
          exercises, personal records and body measurements. Store these files somewhere private.
        </p>
      </Panel>

      <Panel>
        <PanelHeader title="Account" icon={ShieldCheck} description="Your data is private to this account" />
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
