import { Dumbbell } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
        <Dumbbell className="size-5" aria-hidden />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        Fit<span className="text-primary">Track</span>
      </span>
    </div>
  );
}
