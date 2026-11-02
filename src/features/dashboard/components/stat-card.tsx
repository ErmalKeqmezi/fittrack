import { cn } from "@/lib/utils";

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
      <p className="mt-2 text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums sm:mt-3 sm:text-3xl lg:text-2xl xl:text-3xl">{value}</p>
      {detail ? <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
