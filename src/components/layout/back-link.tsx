import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex h-9 w-fit items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <ChevronLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
