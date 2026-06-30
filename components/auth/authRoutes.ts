export const AUTH_PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/terms",
  "/privacy",
  "/onboarding",
] as const;

/** Routes guests may open without logging in (browse only). */
export const GUEST_BROWSABLE_PREFIXES = ["/explore", "/rooms"] as const;

export const DEFAULT_AUTH_REDIRECT = "/";

export function getSafeRedirect(value: string | null | undefined, fallback = DEFAULT_AUTH_REDIRECT) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function isAuthPublicRoute(pathname: string) {
  if ((AUTH_PUBLIC_ROUTES as readonly string[]).includes(pathname)) return true;
  if (pathname.startsWith("/verify-email")) return true;
  return false;
}

export function isGuestBrowsableRoute(pathname: string) {
  if (isAuthPublicRoute(pathname)) return true;
  return GUEST_BROWSABLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
