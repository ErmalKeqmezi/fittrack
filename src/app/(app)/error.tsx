"use client";

import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
      <TriangleAlert className="size-7 text-destructive" aria-hidden />
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {error.message.startsWith("Could not load") ? error.message : "This page could not be loaded. Check your connection and try again."}
      </p>
      <Button onClick={reset} className="mt-2 h-11 rounded-xl px-5">
        <RotateCw aria-hidden /> Try again
      </Button>
    </div>
  );
}
