import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Native select: best picker on phones, styled to match the inputs. */
export function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-11 w-full appearance-none rounded-xl border border-input bg-input/30 pr-8 pl-3 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  );
}
