import { SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export default function AppNotFound() {
  return (
    <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
      <SearchX className="size-7 text-muted-foreground" aria-hidden />
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="text-sm text-muted-foreground">This page doesn&apos;t exist or is no longer available.</p>
      <Button asChild className="mt-2 h-11 rounded-xl px-5">
        <Link href={routes.dashboard}>Back to dashboard</Link>
      </Button>
    </div>
  );
}
