import {
  doc,
  getDoc,
  runTransaction,
  increment,
  serverTimestamp,
} from "firebase/firestore";

const VERIFY_ID_XP = 200;
import { getFirebaseDB } from "./firebase";
import { buildGamificationUser } from "./gamification";
import { getUnlockedAchievementIds } from "./achievements";

type TaskTrackInput = {
  type: "task" | "plan";
  category: string;
  price?: number;
  costType?: string;
  totalSlots?: number;
  maxParticipants?: number;
  createdAt?: Date;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function isMorningHour(date = new Date()): boolean {
  const h = date.getHours();
  return h >= 5 && h < 12;
}

function isEveningHour(date = new Date()): boolean {
  const h = date.getHours();
  return h >= 18 && h < 24;
}

export async function syncAchievementBadges(uid: string): Promise<void> {
  const db = getFirebaseDB();
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const raw = snap.data();
  const user = buildGamificationUser(raw, uid);
  const unlockedIds = getUnlockedAchievementIds(user);
  const badges = unlockedIds.map((id) => `achievement_${id}`);
  const grantVerifyXP = !!raw.isVerifiedId && !raw.verifyXPClaimed;

  await runTransaction(db, async (tx) => {
    const current = await tx.get(userRef);
    if (!current.exists()) return;
    const data = current.data();
    const prev = (data.unlockedAchievements as number[]) || [];
    const merged = Array.from(new Set([...prev, ...unlockedIds]));
    const updates: Record<string, unknown> = {
      badges,
      unlockedAchievements: merged,
      level: user.level,
      updatedAt: serverTimestamp(),
    };
    if (grantVerifyXP && !data.verifyXPClaimed) {
      updates.huhaScore = increment(VERIFY_ID_XP);
      updates.verifyXPClaimed = true;
    }
    tx.update(userRef, updates);
  });
}

export async function trackTaskCreated(
  uid: string,
  input: TaskTrackInput
): Promise<void> {
  const db = getFirebaseDB();
  const userRef = doc(db, "users", uid);
  const now = input.createdAt || new Date();
  const today = todayKey();
  const isFree =
    input.type === "plan"
      ? input.costType === "free"
      : (input.price ?? 0) === 0;
  const category = input.category || "other";

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;
    const d = snap.data();
    const stats = d.stats || {};
    const lastDate = stats.lastTaskCreatedDate as string | undefined;
    const prevStreak = stats.consecutiveTaskDays || 0;
    const newStreak =
      lastDate === today
        ? prevStreak
        : lastDate &&
            new Date(today).getTime() - new Date(lastDate).getTime() === 86400000
          ? prevStreak + 1
          : 1;

    const catKey = `stats.taskCategories.${category}`;
    const updates: Record<string, unknown> = {
      [catKey]: increment(1),
      "stats.consecutiveTaskDays": newStreak,
      "stats.lastTaskCreatedDate": today,
      updatedAt: serverTimestamp(),
    };

    if (input.type === "task") {
      updates["stats.tasksCreated"] = increment(1);
    } else {
      updates["stats.plansCreated"] = increment(1);
      updates["stats.eventsHosted"] = increment(1);
    }

    if (isFree) updates["stats.freeTasksCreated"] = increment(1);
    if (isMorningHour(now)) updates["stats.morningTasks"] = increment(1);
    if (isEveningHour(now)) updates["stats.eveningTasks"] = increment(1);

    tx.update(userRef, updates);
  });

  await syncAchievementBadges(uid);
}

export async function trackTaskJoinCount(
  hostUid: string,
  joinedCount: number
): Promise<void> {
  const db = getFirebaseDB();
  const userRef = doc(db, "users", hostUid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;
    const currentMax = snap.data().stats?.maxTaskJoins || 0;
    if (joinedCount <= currentMax) return;
    tx.update(userRef, {
      "stats.maxTaskJoins": joinedCount,
      updatedAt: serverTimestamp(),
    });
  });

  await syncAchievementBadges(hostUid);
}

export async function incrementCompletedStats(
  uid: string,
  rating: number
): Promise<void> {
  const db = getFirebaseDB();
  const userRef = doc(db, "users", uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;
    const d = snap.data();
    const stats = d.stats || {};
    const prevCompleted = stats.completed || 0;
    const prevReviews = stats.totalReviews || 0;
    const prevRating = stats.rating || 0;
    const newReviews = prevReviews + 1;
    const newRating =
      newReviews > 0
        ? (prevRating * prevReviews + rating) / newReviews
        : rating;

    tx.update(userRef, {
      "stats.completed": prevCompleted + 1,
      "stats.totalReviews": newReviews,
      "stats.rating": Math.round(newRating * 10) / 10,
      updatedAt: serverTimestamp(),
    });
  });

  await syncAchievementBadges(uid);
}

export async function incrementCheckinStats(uid: string): Promise<void> {
  const db = getFirebaseDB();
  const userRef = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;
    tx.update(userRef, {
      "stats.checkins": increment(1),
      "stats.eventsJoined": increment(1),
      updatedAt: serverTimestamp(),
    });
  });
  await syncAchievementBadges(uid);
}
