import { cn } from "@/lib/utils";

export function initialsFor(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function UserAvatar({ name, email, className }: { name: string | null; email: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground ring-1 ring-primary/25",
        className,
      )}
    >
      {initialsFor(name, email)}
    </span>
  );
}
