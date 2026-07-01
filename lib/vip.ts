import type { Timestamp } from "firebase/firestore";

export type VipTier = "free" | "pro" | "elite";

export type VipInfo = {
  tier?: VipTier | string | null;
  expiresAt?: Timestamp | Date | string | null | { toDate?: () => Date };
};

export function getEffectiveVipTier(vip?: VipInfo | null): VipTier {
  if (!vip?.tier) return "free";
  const tier = String(vip.tier).toLowerCase();
  if (tier !== "pro" && tier !== "elite") return "free";

  const raw = vip.expiresAt;
  if (raw) {
    const exp =
      typeof raw === "object" && raw !== null && "toDate" in raw && typeof raw.toDate === "function"
        ? raw.toDate()
        : raw instanceof Date
          ? raw
          : new Date(raw as string);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) return "free";
  }

  return tier as VipTier;
}

export function vipNameClass(tier: VipTier): string {
  if (tier === "elite") return "text-[#F59E0B]";
  if (tier === "pro") return "text-[#0A84FF]";
  return "text-zinc-950 dark:text-white";
}

/** Inline color — overrides inherited button/text colors in cards */
export function vipNameColor(tier: VipTier): string | undefined {
  if (tier === "elite") return "#F59E0B";
  if (tier === "pro") return "#0A84FF";
  return undefined;
}

/** Serialize VIP expiry for JSON/RSC (Firestore Timestamp is not serializable) */
export function serializeVipExpiresAt(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === "object" && raw !== null && "toDate" in raw && typeof raw.toDate === "function") {
    try {
      return raw.toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export function extractAuthorVip(userData?: Record<string, unknown> | null) {
  const vip = (userData?.vip as VipInfo | undefined) ?? null;
  const tier = getEffectiveVipTier(vip);
  return {
    authorVipTier: tier === "free" ? null : tier,
    authorVipExpiresAt: serializeVipExpiresAt(vip?.expiresAt),
  };
}
