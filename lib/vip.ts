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

export function extractAuthorVip(userData?: Record<string, unknown> | null) {
  const vip = (userData?.vip as VipInfo | undefined) ?? null;
  const tier = getEffectiveVipTier(vip);
  return {
    authorVipTier: tier === "free" ? null : tier,
    authorVipExpiresAt: (vip?.expiresAt as Timestamp | null) ?? null,
  };
}
