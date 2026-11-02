import { routes } from "@/config/routes";

/** Only allow same-origin relative paths as post-login destinations. */
export function safeNextPath(value: unknown, fallback: string = routes.dashboard) {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
