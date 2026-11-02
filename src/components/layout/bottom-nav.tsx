import { mobileNav } from "@/config/navigation";

import { BottomNavLink } from "./nav-link";

/** Thumb-reachable navigation on phones and tablets. */
export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch px-2">
        {mobileNav.map((item) => (
          <BottomNavLink key={item.href} href={item.href} />
        ))}
      </div>
    </nav>
  );
}
