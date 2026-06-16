// lib/score.ts
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

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
} as const;

const addHuhaScoreFn = httpsCallable(functions, 'addHuhaScore');

export const addScore = async (action: keyof typeof HuhaScore) => {
  try {
    await addHuhaScoreFn({ action });
  } catch (err) {
    console.error("addScore failed:", err);
  }
};

// Gọi: await addScore('EVENT_JOIN');