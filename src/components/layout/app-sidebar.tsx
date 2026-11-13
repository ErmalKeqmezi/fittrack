import { Logo } from "@/components/brand/logo";
import { primaryNav, secondaryNav } from "@/config/navigation";
import type { CurrentUser } from "@/features/auth/queries";

import { SidebarNavLink } from "./nav-link";
import { UserAvatar } from "./user-avatar";

/** Desktop navigation (lg and up). */
export function AppSidebar({ user }: { user: CurrentUser }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex h-20 items-center px-5">
        <Logo />
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col py-2">
        {primaryNav.map((item) => (
          <SidebarNavLink key={item.href} href={item.href} />
        ))}
      </nav>
      <div className="grid border-t border-border py-3">
        {secondaryNav.map((item) => (
          <SidebarNavLink key={item.href} href={item.href} />
        ))}
        <div className="mt-2 flex items-center gap-3 px-5 py-2">
          <UserAvatar name={user.displayName} email={user.email} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.displayName ?? "Athlete"}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
