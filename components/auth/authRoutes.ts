export const AUTH_PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/terms",
  "/privacy",
  "/onboarding",
  "/rooms",
  "/explore",
] as const;

export const DEFAULT_AUTH_REDIRECT = "/";

export function getSafeRedirect(value: string | null | undefined, fallback = DEFAULT_AUTH_REDIRECT) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function isAuthPublicRoute(pathname: string) {
  return AUTH_PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}
