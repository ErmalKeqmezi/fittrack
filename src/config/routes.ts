export const routes = {
  home: "/",
  login: "/login",
  setup: "/setup",
  authConfirm: "/auth/confirm",
  offline: "/offline",
  dashboard: "/dashboard",
  settings: "/settings",
  exercises: "/exercises",
  newExercise: "/exercises/new",
  plans: "/plans",
  newPlan: "/plans/new",
  workout: "/workout",
  workouts: "/workouts",
  history: "/history",
  progress: "/progress",
  records: "/progress/records",
} as const;

/** Paths that are reachable without a session. Everything else is private. */
export const publicPaths = [routes.login, routes.setup, routes.authConfirm, routes.offline] as const;

export function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
