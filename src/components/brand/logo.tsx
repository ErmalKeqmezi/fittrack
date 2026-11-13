import { cn } from "@/lib/utils";

/** Wordmark with three rising bars: load going up, session after session. */
export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 18 18" className="size-[18px] shrink-0 text-primary" aria-hidden>
        <rect x="0" y="11" width="4" height="7" fill="currentColor" opacity="0.45" />
        <rect x="7" y="6" width="4" height="12" fill="currentColor" opacity="0.7" />
        <rect x="14" y="0" width="4" height="18" fill="currentColor" />
      </svg>
      <span className="font-display text-[1.45rem] leading-none font-bold tracking-[0.04em] uppercase">
        Fit<span className="text-primary">Track</span>
      </span>
    </div>
  );
}
