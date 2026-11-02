import Link from "next/link";

import { cn } from "@/lib/utils";

import { RANGE_LABELS, RANGES, type Range } from "../calculations";

const SHORT: Record<Range, string> = { "7d": "7D", "30d": "30D", "3m": "3M", "6m": "6M", all: "All" };

/** Time range filter, kept in the URL (?range=). */
export function RangeTabs({ pathname, current }: { pathname: string; current: Range }) {
  return (
    <nav aria-label="Time range" className="inline-flex w-fit justify-self-start rounded-xl border border-border bg-secondary p-1">
      {RANGES.map((range) => (
        <Link
          key={range}
          href={`${pathname}?range=${range}`}
          scroll={false}
          aria-current={range === current ? "page" : undefined}
          aria-label={RANGE_LABELS[range]}
          className={cn(
            "grid h-9 min-w-11 place-items-center rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground",
            range === current && "bg-card text-foreground shadow-sm",
          )}
        >
          {SHORT[range]}
        </Link>
      ))}
    </nav>
  );
}
