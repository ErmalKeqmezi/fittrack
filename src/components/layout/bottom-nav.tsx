import { mobileNav } from "@/config/navigation";

import { BottomNavLink } from "./nav-link";

/** Thumb-reachable navigation on phones and tablets. */
export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {mobileNav.map((item) => (
          <BottomNavLink key={item.href} href={item.href} />
        ))}
      </div>
    </nav>
  );
}
