import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Offline" };

/** Shown by the service worker when a page is not available offline. Static: no data. */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <Logo className="mb-8 justify-center" />
        <div className="rounded-2xl border border-border bg-card p-6">
          <WifiOff className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <h1 className="mt-3 text-lg font-semibold">You&apos;re offline</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page hasn&apos;t been opened on this device yet. A workout you already had open keeps its sets on this
            device and syncs when you&apos;re back online.
          </p>
          {/* A plain link forces a full reload once the connection is back. */}
          <a
            href="/dashboard"
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            Try again
          </a>
        </div>
      </div>
    </main>
  );
}
