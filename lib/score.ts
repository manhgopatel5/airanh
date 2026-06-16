// lib/score.ts
import { updateDoc, doc, increment, getDoc } from "firebase/firestore";
import { getFirebaseDB } from "./firebase";

const db = getFirebaseDB();

export const HuhaScore = {
  EVENT_JOIN: 20,
  KEO_SUCCESS: 30,
  CHECKIN_VERIFIED: 10,
  INVITE_FRIEND: 15,
  POSITIVE_REVIEW: 5,
  QUALITY_POST: 10,
  CANCEL_LATE: -20,
  SPAM: -15,
  REPORTED: -10,
};

export const addScore = async (uid: string, action: keyof typeof HuhaScore) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return;

  const currentScore = userSnap.data().huhaScore || 0;
  const newScore = currentScore + HuhaScore[action];

  await updateDoc(userRef, {
    huhaScore: increment(HuhaScore[action]),
    level: Math.floor(newScore / 100) + 1, // Auto tính level
  });
};

// Gọi khi user làm gì đó:
// await addScore(user.uid, 'EVENT_JOIN');