import { cn } from "@/lib/utils";

export type Stat = { label: string; value: React.ReactNode; hint?: React.ReactNode; accent?: boolean };

const COLUMNS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
};

/**
 * Figures set in a ruled strip: large mono numerals over small labels, divided
 * by hairlines instead of sitting in separate cards.
 */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div className={cn("overflow-hidden border-y border-border", className)}>
      <dl className={cn("-mr-px -mb-px grid", COLUMNS[stats.length] ?? COLUMNS[4])}>
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 border-r border-b border-border px-3 py-4 sm:px-5">
            <dt className="eyebrow truncate">{stat.label}</dt>
            <dd
              className={cn(
                "mt-2.5 truncate leading-none font-medium whitespace-nowrap tabular-nums",
                // Long figures step down a size so they never clip on a phone.
                typeof stat.value === "string" && stat.value.length > 9 ? "text-xl sm:text-2xl" : "text-[1.75rem] sm:text-3xl",
                stat.accent && "text-primary",
              )}
            >
              {stat.value}
            </dd>
            {stat.hint ? <div className="mt-2 truncate text-xs text-muted-foreground">{stat.hint}</div> : null}
          </div>
        ))}
      </dl>
    </div>
  );
}
