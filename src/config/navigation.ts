import { LayoutDashboard, Settings, type LucideIcon } from "lucide-react";

import { routes } from "./routes";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Primary navigation. Sections are added here as each phase ships, so the
 * menu never links to a page that does not exist yet.
 */
export const primaryNav: NavItem[] = [
  { href: routes.dashboard, label: "Dashboard", icon: LayoutDashboard },
];

export const secondaryNav: NavItem[] = [{ href: routes.settings, label: "Settings", icon: Settings }];

export const mobileNav: NavItem[] = [...primaryNav, ...secondaryNav];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
