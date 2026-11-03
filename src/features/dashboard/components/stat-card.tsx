import { cn } from "@/lib/utils";

/** Long values (e.g. "1,234,567 kg") step down a size so they fit narrow phone cards. */
export function statValueSize(value: string) {
  return value.length > 9 ? "text-lg sm:text-2xl lg:text-xl xl:text-2xl" : "text-2xl sm:text-3xl lg:text-2xl xl:text-3xl";
}

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  detail?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
        <Icon className="size-4 text-primary" aria-hidden />
      </div>
      <p className={cn("mt-2 font-semibold tracking-tight whitespace-nowrap tabular-nums sm:mt-3", statValueSize(value))}>{value}</p>
      {detail ? <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
