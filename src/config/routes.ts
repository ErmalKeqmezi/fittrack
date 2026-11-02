export const routes = {
  home: "/",
  login: "/login",
  setup: "/setup",
  authConfirm: "/auth/confirm",
  dashboard: "/dashboard",
} as const;

/** Paths that are reachable without a session. Everything else is private. */
export const publicPaths = [routes.login, routes.setup, routes.authConfirm] as const;

export function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
