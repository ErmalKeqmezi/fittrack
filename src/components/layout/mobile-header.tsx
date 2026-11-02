import { BookOpen } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { routes } from "@/config/routes";
import type { CurrentUser } from "@/features/auth/queries";

import { UserAvatar } from "./user-avatar";

/** Compact top bar on phones and tablets. */
export function MobileHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-lg lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <Link
            href={routes.exercises}
            aria-label="Exercise library"
            className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <BookOpen className="size-5" aria-hidden />
          </Link>
          <Link href={routes.settings} aria-label="Account settings" className="rounded-full focus-visible:outline-2 focus-visible:outline-ring">
            <UserAvatar name={user.displayName} email={user.email} />
          </Link>
        </div>
      </div>
    </header>
  );
}
