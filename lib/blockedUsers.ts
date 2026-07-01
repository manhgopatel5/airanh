import type { BlockedUserEntry } from "@/types/settings";

export function normalizeBlockedUsers(raw: unknown): BlockedUserEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item) =>
      typeof item === "string" ||
      (typeof item === "object" && item !== null && "uid" in item)
  ) as BlockedUserEntry[];
}

export function countBlockedUsers(raw: unknown): number {
  return normalizeBlockedUsers(raw).length;
}

export function getBlockedUids(raw: unknown): string[] {
  return normalizeBlockedUsers(raw).map((item) =>
    typeof item === "string" ? item : item.uid
  );
}
