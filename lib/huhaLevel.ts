import { getLevelFromXP } from "./gamification";
import { XP_REWARDS } from "./xp";

export type HuhaLevelTier = {
  minLevel: number;
  maxLevel: number;
  name: string;
  gradient: string;
  perks: string;
};

export const HUHA_LEVEL_TIERS: HuhaLevelTier[] = [
  {
    minLevel: 1,
    maxLevel: 7,
    name: "Mới tham gia",
    gradient: "from-sky-400 to-blue-600",
    perks: "Bắt đầu hành trình trên Airanh",
  },
  {
    minLevel: 8,
    maxLevel: 19,
    name: "Thành viên tích cực",
    gradient: "from-emerald-500 to-teal-500",
    perks: "Hoạt động thường xuyên, được đánh giá tốt",
  },
  {
    minLevel: 20,
    maxLevel: 34,
    name: "Đối tác tin cậy",
    gradient: "from-blue-500 to-sky-500",
    perks: "Được cộng đồng tin tưởng cao",
  },
  {
    minLevel: 35,
    maxLevel: 49,
    name: "Chuyên gia",
    gradient: "from-violet-500 to-fuchsia-500",
    perks: "Kinh nghiệm dày dặn, uy tín hàng đầu",
  },
  {
    minLevel: 50,
    maxLevel: 999,
    name: "Huyền thoại",
    gradient: "from-amber-400 to-orange-500",
    perks: "Biểu tượng uy tín của cộng đồng",
  },
];

export function xpRequiredForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function cumulativeXpBeforeLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += xpRequiredForLevel(l);
  }
  return total;
}

export function getTierForLevel(level: number): HuhaLevelTier {
  return (
    HUHA_LEVEL_TIERS.find((t) => level >= t.minLevel && level <= t.maxLevel) ||
    HUHA_LEVEL_TIERS[0]!
  );
}

export function formatXpRange(tier: HuhaLevelTier): string {
  const start = cumulativeXpBeforeLevel(tier.minLevel);
  const end =
    tier.maxLevel >= 999
      ? null
      : cumulativeXpBeforeLevel(tier.maxLevel + 1) - 1;
  if (end == null) return `${start.toLocaleString("vi-VN")}+`;
  return `${start.toLocaleString("vi-VN")} – ${end.toLocaleString("vi-VN")}`;
}

export const HUHA_XP_SOURCES = [
  { label: "Đăng nhập hàng ngày", xp: XP_REWARDS.DAILY_LOGIN, note: "×2 nếu streak ≥ 7 ngày" },
  { label: "Hoàn thành task/plan", xp: XP_REWARDS.COMPLETE_JOB },
  { label: "Đánh giá 4–5 sao", xp: XP_REWARDS.REVIEW_4_5_STAR },
  { label: "Đánh giá 1–3 sao", xp: XP_REWARDS.REVIEW_1_3_STAR },
  { label: "Kết bạn mới", xp: XP_REWARDS.NEW_FRIEND },
  { label: "Task hot (≥5 người)", xp: XP_REWARDS.HOT_TASK },
  { label: "Check-in sự kiện", xp: XP_REWARDS.CHECKIN_EVENT },
  { label: "Hồ sơ 100%", xp: XP_REWARDS.PROFILE_COMPLETE },
  { label: "Xác minh CCCD", xp: XP_REWARDS.VERIFY_ID },
] as const;

export function summarizeLevel(huhaScore: number) {
  const { level, currentExp, nextLevelExp } = getLevelFromXP(huhaScore);
  const tier = getTierForLevel(level);
  const progress = nextLevelExp > 0 ? Math.round((currentExp / nextLevelExp) * 100) : 0;
  return { level, currentExp, nextLevelExp, progress, tier, huhaScore };
}
