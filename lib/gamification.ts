import type { Timestamp } from "firebase/firestore";

export type GamificationStats = {
  completed?: number;
  rating?: number;
  totalReviews?: number;
  streakDays?: number;
  eventsJoined?: number;
  checkins?: number;
  groupsManaged?: number;
  eventsHosted?: number;
  tasksCreated?: number;
  plansCreated?: number;
  maxTaskJoins?: number;
  freeTasksCreated?: number;
  consecutiveTaskDays?: number;
  lastTaskCreatedDate?: string;
  morningTasks?: number;
  eveningTasks?: number;
  taskCategories?: Record<string, number>;
  internationalTasks?: number;
};

export type GamificationUser = {
  uid?: string;
  huhaScore: number;
  level: number;
  exp: number;
  nextLevelExp: number;
  streakDays: number;
  friendCount: number;
  joinedDays: number;
  profileCompletion: number;
  trustScore: number;
  emailVerified: boolean;
  isVerifiedId: boolean;
  skills: string[];
  portfolio: unknown[];
  location: string;
  stats: GamificationStats;
  badges: string[];
};

export function getLevelFromXP(xp: number): {
  level: number;
  currentExp: number;
  nextLevelExp: number;
} {
  let level = 1;
  let totalXP = 0;

  while (true) {
    const nextLevelExp = Math.floor(100 * Math.pow(level, 1.5));
    if (xp < totalXP + nextLevelExp) break;
    totalXP += nextLevelExp;
    level++;
  }

  const currentExp = xp - totalXP;
  const nextLevelExp = Math.floor(100 * Math.pow(level, 1.5));

  return { level, currentExp, nextLevelExp };
}

export function calcProfileCompletion(d: Record<string, unknown>): number {
  const fields = [
    d.avatar || d.photoURL,
    d.bio,
    (d.skills as string[] | undefined)?.length,
    (d.portfolio as unknown[] | undefined)?.length,
    d.location,
    d.title,
    d.emailVerified,
    d.isVerifiedId,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export type TrustBreakdown = {
  rating: number;
  completed: number;
  reviews: number;
  verification: number;
  tenure: number;
  total: number;
};

export type TrustScoreInput = {
  stats: GamificationStats;
  emailVerified?: boolean;
  isVerifiedId?: boolean;
  joinedDays?: number;
};

export function calcTrustBreakdown(input: TrustScoreInput): TrustBreakdown {
  const { stats, emailVerified, isVerifiedId, joinedDays = 0 } = input;
  const rating = Math.min(Math.floor((stats.rating || 0) * 15), 75);
  const completed = Math.min(Math.floor((stats.completed || 0) * 1.2), 30);
  const reviews = Math.min(stats.totalReviews || 0, 20);
  const verification = (emailVerified ? 5 : 0) + (isVerifiedId ? 5 : 0);
  const tenure = Math.min(Math.floor(joinedDays / 30), 5);
  const total = Math.min(100, rating + completed + reviews + verification + tenure);
  return { rating, completed, reviews, verification, tenure, total };
}

export function calcTrustScore(stats: GamificationStats, extras?: Omit<TrustScoreInput, "stats">): number {
  return calcTrustBreakdown({ stats, ...extras }).total;
}

export function calcJoinedDays(
  createdAt?: Timestamp | { seconds: number } | string | Date | null
): number {
  if (!createdAt) return 0;

  let ms: number | null = null;

  if (typeof createdAt === "string") {
    const parsed = new Date(createdAt);
    ms = Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  } else if (createdAt instanceof Date) {
    ms = createdAt.getTime();
  } else if (typeof createdAt === "object" && "seconds" in createdAt) {
    const seconds = Number(createdAt.seconds);
    ms = Number.isNaN(seconds) ? null : seconds * 1000;
  } else if (
    typeof createdAt === "object" &&
    createdAt !== null &&
    "toDate" in createdAt &&
    typeof (createdAt as Timestamp).toDate === "function"
  ) {
    ms = (createdAt as Timestamp).toDate().getTime();
  }

  if (!ms) return 0;
  return Math.floor((Date.now() - ms) / 86400000);
}

export function buildGamificationUser(
  d: Record<string, unknown>,
  uid?: string,
  friendCountOverride?: number
): GamificationUser {
  const huhaScore = (d.huhaScore as number) || 0;
  const { level, currentExp, nextLevelExp } = getLevelFromXP(huhaScore);
  const stats = (d.stats as GamificationStats) || {};

  const user: GamificationUser = {
    ...(uid ? { uid } : {}),
    huhaScore,
    level,
    exp: currentExp,
    nextLevelExp,
    streakDays: stats.streakDays || 0,
    friendCount: friendCountOverride ?? ((d.friendCount as number) || 0),
    joinedDays: calcJoinedDays(d.createdAt as Timestamp),
    profileCompletion: calcProfileCompletion(d),
    trustScore: calcTrustScore(stats, {
      emailVerified: !!(d.emailVerified),
      isVerifiedId: !!(d.isVerifiedId),
      joinedDays: calcJoinedDays(d.createdAt as Timestamp),
    }),
    emailVerified: !!(d.emailVerified),
    isVerifiedId: !!(d.isVerifiedId),
    skills: (d.skills as string[]) || [],
    portfolio: (d.portfolio as unknown[]) || [],
    location: (d.location as string) || "",
    stats,
    badges: (d.badges as string[]) || [],
  };

  return user;
}

export function getCategoryCount(u: GamificationUser, ...categories: string[]): number {
  const cats = u.stats.taskCategories || {};
  return categories.reduce((sum, c) => sum + (cats[c] || 0), 0);
}

export function getTasksCreatedTotal(u: GamificationUser): number {
  return (u.stats.tasksCreated || 0) + (u.stats.plansCreated || 0);
}
