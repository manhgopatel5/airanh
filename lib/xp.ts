import { doc, updateDoc, increment, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB } from "./firebase";

export const XP_REWARDS = {
  DAILY_LOGIN: 5,
  COMPLETE_JOB: 50,
  REVIEW_4_5_STAR: 20,
  REVIEW_1_3_STAR: 5,
  NEW_FRIEND: 10,
  HOT_TASK: 30, // Task có 5+ người join
  CHECKIN_EVENT: 15,
  PROFILE_COMPLETE: 100, // One-time
  VERIFY_ID: 200, // One-time
} as const;

type XPAction = keyof typeof XP_REWARDS;

const db = getFirebaseDB();

// Hàm cộng XP chính - dùng transaction để chống race condition
export const addXP = async (uid: string, action: XPAction, customAmount?: number) => {
  const userRef = doc(db, "users", uid);
  const amount = customAmount?? XP_REWARDS[action];

  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();

    // Check one-time rewards
    if (action === "PROFILE_COMPLETE" && data.profileXPClaimed) return;
    if (action === "VERIFY_ID" && data.verifyXPClaimed) return;

    const updateData: any = {
      huhaScore: increment(amount),
    };

    // Đánh dấu đã nhận one-time XP
    if (action === "PROFILE_COMPLETE") updateData.profileXPClaimed = true;
    if (action === "VERIFY_ID") updateData.verifyXPClaimed = true;

    transaction.update(userRef, updateData);
  });
};

// 1. Streak hàng ngày - gọi khi user mở app
export const checkDailyLoginXP = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const data = userSnap.data();
  const lastLogin = data.lastLoginAt?.toDate();
  const now = new Date();

  if (!lastLogin || lastLogin.toDateString()!== now.toDateString()) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isConsecutive = lastLogin?.toDateString() === yesterday.toDateString();
    const newStreak = isConsecutive? (data.stats?.streakDays || 0) + 1 : 1;

    await updateDoc(userRef, {
      huhaScore: increment(XP_REWARDS.DAILY_LOGIN),
      lastLoginAt: serverTimestamp(),
      "stats.streakDays": newStreak,
    });
  }
};

// 2. Hoàn thành job - gọi khi job status = completed
export const onJobCompleted = async (uid: string, rating: number, taskId: string) => {
  const taskRef = doc(db, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) return;

  const data = taskSnap.data();
  if (data.xpClaimed) return; // Đã cộng rồi thì thôi

  await addXP(uid, "COMPLETE_JOB");
  if (rating >= 4) {
    await addXP(uid, "REVIEW_4_5_STAR");
  } else {
    await addXP(uid, "REVIEW_1_3_STAR");
  }

  await updateDoc(taskRef, { xpClaimed: true });
};

// 3. Có bạn mới - gọi khi accept friend request
export const onNewFriend = async (uid: string) => {
  await addXP(uid, "NEW_FRIEND");
};

// 4. Tạo task hot - gọi khi task có đủ 5 người join
export const onHotTaskCreated = async (hostUid: string, taskId: string) => {
  const taskRef = doc(db, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) return;

  const data = taskSnap.data();
  if (data.participants?.length >= 5 &&!data.hotTaskXPClaimed) {
    await addXP(hostUid, "HOT_TASK");
    await updateDoc(taskRef, { hotTaskXPClaimed: true });
  }
};

// 5. Check-in sự kiện
export const onEventCheckin = async (uid: string) => {
  await addXP(uid, "CHECKIN_EVENT");
};

// 6. Hoàn thành profile 100% - gọi khi update profile
export const onProfileUpdate = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const d = userSnap.data();
  const profileFields = [d.avatar, d.bio, d.skills?.length, d.portfolio?.length, d.location, d.title, d.emailVerified, d.isVerifiedId];
  const profileCompletion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  if (profileCompletion === 100) {
    await addXP(uid, "PROFILE_COMPLETE");
  }
};

// 7. Xác minh CCCD
export const onVerifyID = async (uid: string) => {
  await addXP(uid, "VERIFY_ID");
};