import { cn } from "@/lib/utils";

/**
 * A page section. Sections are separated by a hairline rule and a labelled
 * heading rather than boxed in cards, so pages read like a training journal.
 */
export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("border-t border-border pt-4", className)} {...props} />;
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  /** Kept so callers don't change; section headings no longer carry a decorative icon. */
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 text-xl leading-none font-semibold">
          <span aria-hidden className="h-4 w-1 shrink-0 bg-primary" />
          <span className="truncate">{title}</span>
        </h2>
        {description ? <p className="mt-2 truncate text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5 border-l-2 border-border py-2 pl-4">
      <Icon className="size-5 text-faint" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {children ? <p className="max-w-sm text-xs text-muted-foreground">{children}</p> : null}
    </div>
  );
}
