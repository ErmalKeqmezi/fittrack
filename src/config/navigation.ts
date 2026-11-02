import { BookOpen, ClipboardList, Dumbbell, History, LayoutDashboard, Settings, type LucideIcon } from "lucide-react";

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
const dashboard: NavItem = { href: routes.dashboard, label: "Dashboard", icon: LayoutDashboard };
const workout: NavItem = { href: routes.workout, label: "Workout", icon: Dumbbell };
const history: NavItem = { href: routes.history, label: "History", icon: History };
const plans: NavItem = { href: routes.plans, label: "Plans", icon: ClipboardList };
const exercises: NavItem = { href: routes.exercises, label: "Exercises", icon: BookOpen };

export const primaryNav: NavItem[] = [dashboard, workout, history, plans, exercises];

export const secondaryNav: NavItem[] = [{ href: routes.settings, label: "Settings", icon: Settings }];

/** Phones: five thumb targets with Workout in the middle; Settings sits behind the header avatar. */
export const mobileNav: NavItem[] = [dashboard, plans, workout, history, exercises];

export function isActivePath(pathname: string, href: string) {
  if (href === routes.workout && pathname.startsWith(`${routes.workouts}/`)) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}
