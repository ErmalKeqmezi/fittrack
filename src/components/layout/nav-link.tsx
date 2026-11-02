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
        "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
        active && "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className={cn("size-[18px] transition-colors", active && "text-primary")} aria-hidden />
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
        "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors",
        "focus-visible:outline-2 focus-visible:outline-ring active:scale-95",
        active && "text-brand-soft",
      )}
    >
      <span
        className={cn(
          "grid h-8 w-14 place-items-center rounded-full transition-colors",
          active && "bg-accent text-primary",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      {item.label}
    </Link>
  );
}
