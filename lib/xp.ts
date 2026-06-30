import { doc, updateDoc, increment, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB } from "./firebase";
import { calcProfileCompletion } from "./gamification";
import {
  incrementCheckinStats,
  incrementCompletedStats,
  syncAchievementBadges,
  trackTaskJoinCount,
} from "./gamificationStats";

export const XP_REWARDS = {
  DAILY_LOGIN: 5,
  COMPLETE_JOB: 50,
  REVIEW_4_5_STAR: 20,
  REVIEW_1_3_STAR: 5,
  NEW_FRIEND: 10,
  HOT_TASK: 30,
  CHECKIN_EVENT: 15,
  PROFILE_COMPLETE: 100,
  VERIFY_ID: 200,
} as const;

type XPAction = keyof typeof XP_REWARDS;

const db = getFirebaseDB();

export const addXP = async (uid: string, action: XPAction, customAmount?: number) => {
  const userRef = doc(db, "users", uid);
  const amount = customAmount ?? XP_REWARDS[action];

  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    if (action === "PROFILE_COMPLETE" && data.profileXPClaimed) return;
    if (action === "VERIFY_ID" && data.verifyXPClaimed) return;

    const updateData: Record<string, unknown> = {
      huhaScore: increment(amount),
    };

    if (action === "PROFILE_COMPLETE") updateData.profileXPClaimed = true;
    if (action === "VERIFY_ID") updateData.verifyXPClaimed = true;

    transaction.update(userRef, updateData);
  });

  await syncAchievementBadges(uid);
};

export const checkDailyLoginXP = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const data = userSnap.data();
  const lastLogin = data.lastLoginAt?.toDate?.();
  const now = new Date();

  if (!lastLogin || lastLogin.toDateString() !== now.toDateString()) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isConsecutive = lastLogin?.toDateString() === yesterday.toDateString();
    const newStreak = isConsecutive ? (data.stats?.streakDays || 0) + 1 : 1;
    const multiplier = newStreak >= 7 ? 2 : 1;
    const xpAmount = XP_REWARDS.DAILY_LOGIN * multiplier;

    await updateDoc(userRef, {
      huhaScore: increment(xpAmount),
      lastLoginAt: serverTimestamp(),
      "stats.streakDays": newStreak,
    });

    await syncAchievementBadges(uid);
  }
};

export const onJobCompleted = async (uid: string, rating: number, taskId: string) => {
  const taskRef = doc(db, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) return;

  const data = taskSnap.data();
  if (data.xpClaimed) return;

  await incrementCompletedStats(uid, rating);
  await addXP(uid, "COMPLETE_JOB");
  if (rating >= 4) {
    await addXP(uid, "REVIEW_4_5_STAR");
  } else {
    await addXP(uid, "REVIEW_1_3_STAR");
  }

  await updateDoc(taskRef, { xpClaimed: true });
};

export const onPlanCompleted = async (hostUid: string, rating: number, planId: string) => {
  const planRef = doc(db, "tasks", planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) return;

  const data = planSnap.data();
  if (data.xpClaimed) return;

  await incrementCompletedStats(hostUid, rating);
  await addXP(hostUid, "COMPLETE_JOB");
  if (rating >= 4) {
    await addXP(hostUid, "REVIEW_4_5_STAR");
  } else {
    await addXP(hostUid, "REVIEW_1_3_STAR");
  }

  await updateDoc(planRef, { xpClaimed: true });
};

export const onNewFriend = async (uid: string) => {
  await addXP(uid, "NEW_FRIEND");
};

export const onHotTaskCreated = async (
  hostUid: string,
  itemId: string,
  _type: "task" | "plan" = "task"
) => {
  const itemRef = doc(db, "tasks", itemId);
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) return;

  const data = itemSnap.data();
  const joinedCount =
    data.joined ||
    data.currentParticipants ||
    data.participants?.length ||
    0;

  if (joinedCount >= 5 && !data.hotTaskXPClaimed) {
    await addXP(hostUid, "HOT_TASK");
    await updateDoc(itemRef, { hotTaskXPClaimed: true });
  }

  await trackTaskJoinCount(hostUid, joinedCount);
};

export const onEventCheckin = async (uid: string) => {
  await incrementCheckinStats(uid);
  await addXP(uid, "CHECKIN_EVENT");
};

export const onProfileUpdate = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const d = userSnap.data();
  if (calcProfileCompletion(d) === 100) {
    await addXP(uid, "PROFILE_COMPLETE");
  }

  await syncAchievementBadges(uid);
};

export const onVerifyID = async (uid: string) => {
  await addXP(uid, "VERIFY_ID");
  await syncAchievementBadges(uid);
};
