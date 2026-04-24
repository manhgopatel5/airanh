"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  Auth,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  serverTimestamp,
  Firestore,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  getStorage,
  FirebaseStorage,
  connectStorageEmulator,
} from "firebase/storage";
import {
  getAnalytics,
  Analytics,
  isSupported as isAnalyticsSupported,
} from "firebase/analytics";
import { getDatabase, Database } from "firebase/database";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  AppCheck,
} from "firebase/app-check";

/* ================= VALIDATE ENV ================= */
const requiredEnvs = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

for (const env of requiredEnvs) {
  if (!process.env[env]) {
    throw new Error(`Missing Firebase env: ${env}`);
  }
}

/* ================= CONFIG ================= */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  ...(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID && {
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  }),
  ...(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL && {
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  }),
};

/* ================= INIT APP ================= */
const app: FirebaseApp =
  getApps().length ? getApp() : initializeApp(firebaseConfig);

/* ================= APP CHECK ================= */
let appCheck: AppCheck | null = null;

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
    ),
    isTokenAutoRefreshEnabled: true,
  });
}

/* ================= AUTH ================= */
const auth: Auth = getAuth(app);

export const authReady: Promise<void> =
  typeof window !== "undefined"
    ? setPersistence(auth, browserLocalPersistence).catch(() => {})
    : Promise.resolve();

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
) {
  connectAuthEmulator(auth, "http://localhost:9099", {
    disableWarnings: true,
  });
}

/* ================= FIRESTORE ================= */
let db: Firestore;

if (typeof window === "undefined") {
  db = getFirestore(app);
} else {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      }),
    });
  } catch {
    db = getFirestore(app);
  }

  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
  ) {
    connectFirestoreEmulator(db, "localhost", 8080);
  }
}

/* ================= RTDB ================= */
const rtdb: Database = getDatabase(app);

/* ================= STORAGE ================= */
const storage: FirebaseStorage = getStorage(app);

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
) {
  connectStorageEmulator(storage, "localhost", 9199);
}

/* ================= ANALYTICS ================= */
let analyticsInstance: Analytics | null = null;

export const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (typeof window === "undefined") return null;
  if (analyticsInstance) return analyticsInstance;

  try {
    if (await isAnalyticsSupported()) {
      analyticsInstance = getAnalytics(app);
      return analyticsInstance;
    }
  } catch {}

  return null;
};

/* ================= EXPORT ================= */
export {
  app,
  auth,
  db,
  rtdb,
  storage,
  appCheck,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
};