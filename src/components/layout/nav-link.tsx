"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, mobileNav, primaryNav, secondaryNav, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

// Nav items hold icon components, which cannot cross the server/client
// boundary as props, so client links look them up by href.
const allItems = [...primaryNav, ...secondaryNav, ...mobileNav];
function itemFor(href: string): NavItem {
  const item = allItems.find((i) => i.href === href);
  if (!item) throw new Error(`Unknown nav item: ${href}`);
  return item;
}

export function SidebarNavLink({ href }: { href: string }) {
  const item = itemFor(href);
  const active = isActivePath(usePathname(), item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-11 items-center gap-3 px-5 font-display text-[1.05rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase transition-colors",
        "hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        // The current section is marked by a bar on the edge, not a filled pill.
        active && "text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-primary",
      )}
    >
      <Icon className={cn("size-[17px] transition-colors", active ? "text-primary" : "text-faint")} aria-hidden />
      {item.label}
    </Link>
  );
}

export function BottomNavLink({ href }: { href: string }) {
  const item = itemFor(href);
  const active = isActivePath(usePathname(), item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[3.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 overflow-hidden font-display text-[10px] font-semibold tracking-[0.04em] text-faint uppercase transition-colors min-[380px]:text-[11px] min-[380px]:tracking-[0.1em]",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:text-foreground",
        active && "text-foreground before:absolute before:inset-x-3 before:top-0 before:h-0.5 before:bg-primary",
      )}
    >
      <Icon className={cn("size-5", active && "text-primary")} aria-hidden />
      {item.label}
    </Link>
  );
}
