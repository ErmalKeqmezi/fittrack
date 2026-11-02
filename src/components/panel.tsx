import { cn } from "@/lib/utils";

/** Rounded content surface used across the app. */
export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-2xl border border-border bg-card p-4 sm:p-5", className)} {...props} />;
}

export function PanelHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-primary">
            <Icon className="size-4" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold leading-8">{title}</h2>
          {description ? <p className="-mt-1 truncate text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
      <Icon className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {children ? <p className="max-w-xs text-xs text-muted-foreground">{children}</p> : null}
    </div>
  );
}
