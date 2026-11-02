import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { formatSignedKg } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Up/down indicator. Text stays in text colours; only the arrow carries the accent. */
export function ChangeBadge({ value, unit, className }: { value: number | null; unit: "%" | "kg"; className?: string }) {
  if (value === null) return <span className={cn("text-xs text-muted-foreground", className)}>No earlier data</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : ArrowRight;
  const text = unit === "kg" ? formatSignedKg(value) : `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value)}%`;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", value > 0 ? "text-brand-soft" : "text-muted-foreground", className)}>
      <Icon className={cn("size-3.5", value > 0 && "text-primary")} aria-hidden />
      {text}
    </span>
  );
}
