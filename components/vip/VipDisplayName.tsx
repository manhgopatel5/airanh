"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getEffectiveVipTier, vipNameClass, type VipInfo } from "@/lib/vip";

type Props = {
  name: string;
  vip?: VipInfo | null;
  className?: string;
  badgeClassName?: string;
};

export default function VipDisplayName({ name, vip, className, badgeClassName }: Props) {
  const tier = getEffectiveVipTier(vip);
  const isPro = tier === "pro";
  const isElite = tier === "elite";

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <span className={cn("truncate font-bold", vipNameClass(tier))}>{name}</span>
      {isPro && (
        <span className={cn("shrink-0 text-[13px] leading-none", badgeClassName)} aria-label="VIP Pro">
          💎
        </span>
      )}
      {isElite && (
        <motion.span
          animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={cn("shrink-0 text-[13px] leading-none", badgeClassName)}
          style={{ filter: "drop-shadow(0 0 6px rgba(245,158,11,0.7))" }}
          aria-label="VIP Elite"
        >
          👑
        </motion.span>
      )}
    </span>
  );
}
