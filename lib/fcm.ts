"use client";

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  deleteToken,
  isSupported,
  Messaging,
  MessagePayload,
} from "firebase/messaging";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "sonner";

/* ================= CONFIG ================= */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
if (!VAPID_KEY) throw new Error("Missing NEXT_PUBLIC_FCM_VAPID_KEY");

/* ================= INIT ================= */
let app: FirebaseApp;
let messaging: Messaging | null = null;
let fcmReady: Promise<Messaging | null> | null = null;

const storage = {
  get: (key: string): string | null => {
    try {
      return typeof window!== "undefined"? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  set: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (fcmReady) return fcmReady;

  fcmReady = (async () => {
    try {
      if (typeof window === "undefined") return null;
      if (!("serviceWorker" in navigator)) return null;
      if (!("Notification" in window)) return null;
      if (!(await isSupported())) return null;

      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      messaging = getMessaging(app);
      return messaging;
    } catch (e) {
      console.error("FCM not supported:", e);
      return null;
    }
  })();

  return fcmReady;
};

/* ================= FCM CORE ================= */
type FCMCallback = (payload: MessagePayload) => void;
const fcmCallbacks = new Set<FCMCallback>();
const initializedUsers = new Set<string>();
let messageUnsub: (() => void) | null = null;

export const initFCM = async (
  userId: string,
  onMessageCallback?: FCMCallback
): Promise<string | null> => {
  const msg = await getMessagingInstance();
  if (!msg ||!userId) return null;

  if (initializedUsers.has(userId)) {
    if (onMessageCallback) fcmCallbacks.add(onMessageCallback);
    return storage.get(`fcm_token_${userId}`);
  }

  try {
    if (Notification.permission === "denied") return null;

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission!== "granted") return null;
    }

    let registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
    if (!registration) {
      registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    }
    await navigator.serviceWorker.ready;

    const existingToken = storage.get(`fcm_token_${userId}`);
    if (existingToken) {
      const userDoc = await getDoc(doc(db, "users", userId));
      const tokenUpdatedAt = userDoc.data()?.fcmTokenUpdatedAt?.toMillis() || 0;
      const daysSinceUpdate = (Date.now() - tokenUpdatedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 25) {
        initializedUsers.add(userId);
        if (onMessageCallback) fcmCallbacks.add(onMessageCallback);
        return existingToken;
      }
    }

    let token: string | null = null;
    for (let i = 0; i < 3; i++) {
      try {
        token = await getToken(msg, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        if (token) break;
      } catch (e) {
        console.warn(`getToken attempt ${i + 1} failed:`, e);
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }

    if (!token) throw new Error("Failed to get FCM token");

    await setDoc(
      doc(db, "users", userId),
      {
        fcmTokens: arrayUnion(token),
        fcmTokenUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    storage.set(`fcm_token_${userId}`, token);
    initializedUsers.add(userId);

    if (!messageUnsub) {
      messageUnsub = onMessage(msg, (payload) => {
        console.log("🔥 FCM foreground:", payload);
        if (payload.notification) {
          toast(payload.notification.title, {
            description: payload.notification.body,
            action: {
              label: "Xem",
              onClick: () => {
                if (payload.data?.link) window.location.href = payload.data.link;
              },
            },
          });
        }
        fcmCallbacks.forEach((cb) => cb(payload));
      });
    }

    if (onMessageCallback) fcmCallbacks.add(onMessageCallback);

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "FCM_TOKEN_EXPIRED") {
        console.log("Token expired, refreshing...");
        refreshFCMToken(userId);
      }
    });

    return token;
  } catch (e) {
    console.error("FCM init error:", e);
    return null;
  }
};

/* ================= CLEAR TOKEN ================= */
export const clearFCMToken = async (userId: string): Promise<void> => {
  const msg = await getMessagingInstance();
  if (!msg ||!userId) return;

  const token = storage.get(`fcm_token_${userId}`);
  try {
    if (token) {
      await deleteToken(msg, token);
      await updateDoc(doc(db, "users", userId), {
        fcmTokens: arrayRemove(token),
      });
    }
  } catch (e) {
    console.warn("Clear token error:", e);
  } finally {
    storage.remove(`fcm_token_${userId}`);
    initializedUsers.delete(userId);
  }
};

/* ================= REFRESH TOKEN ================= */
export const refreshFCMToken = async (userId: string): Promise<string | null> => {
  await clearFCMToken(userId);
  return await initFCM(userId);
};

/* ================= UNSUBSCRIBE ================= */
export const unsubscribeFCM = (callback: FCMCallback): void => {
  fcmCallbacks.delete(callback);
};

/* ================= CHECK & AUTO REFRESH ================= */
export const checkAndRefreshToken = async (userId: string): Promise<void> => {
  if (!userId) return;
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const tokenUpdatedAt = userDoc.data()?.fcmTokenUpdatedAt?.toMillis() || 0;
    const daysSinceUpdate = (Date.now() - tokenUpdatedAt) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate > 25) {
      console.log("FCM token expiring, refreshing...");
      await refreshFCMToken(userId);
    }
  } catch (e) {
    console.error("Check token error:", e);
  }
};

/* ================= GET CURRENT TOKEN ================= */
export const getFCMToken = (userId: string): string | null => {
  return storage.get(`fcm_token_${userId}`);
};

/* ================= PERMISSION STATE ================= */
export const getFCMPermission = (): NotificationPermission => {
  return typeof window!== "undefined" && "Notification" in window
? Notification.permission
    : "denied";
};

/* ================= SUBSCRIBE TOPIC ================= */
export const subscribeToTopic = async (userId: string, topic: string): Promise<void> => {
  const token = await initFCM(userId);
  if (!token) throw new Error("No FCM token");

  const res = await fetch("/api/fcm/topic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, topic, action: "subscribe" }),
  });
  if (!res.ok) throw new Error("Subscribe topic failed");
};

export const unsubscribeFromTopic = async (userId: string, topic: string): Promise<void> => {
  const token = storage.get(`fcm_token_${userId}`);
  if (!token) return;

  await fetch("/api/fcm/topic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, topic, action: "unsubscribe" }),
  });
};
