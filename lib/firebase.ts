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
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, Analytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getDatabase, Database } from "firebase/database";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";

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
    throw new Error(`Missing Firebase env: ${env}. Check .env.local`);
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
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

/* ================= APP CHECK ================= */
let appCheck: AppCheck | null = null;
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

/* ================= AUTH ================= */
const auth: Auth = getAuth(app);

export const authReady: Promise<void> =
  typeof window !== "undefined"
    ? setPersistence(auth, browserLocalPersistence).catch((e) => {
        console.error("Set persistence failed:", e);
      })
    : Promise.resolve();

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
) {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
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
  } catch (e: any) {
    if (e.code === "failed-precondition") {
      console.warn("Multiple tabs: fallback to memory cache");
      db = initializeFirestore(app, {});
    } else if (e.code === "already-exists") {
      db = getFirestore(app);
    } else {
      console.warn("IndexedDB failed, using memory:", e);
      db = initializeFirestore(app, {});
    }
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

/* ================= FCM (FIX SSR) ================= */
type MessagingType = any;
type MessagePayloadType = any;

let messagingInstance: MessagingType | null = null;
let messagingPromise: Promise<MessagingType | null> | null = null;

export const getMessagingInstance = async (): Promise<MessagingType | null> => {
  if (typeof window === "undefined") return null;
  if (messagingInstance) return messagingInstance;
  if (messagingPromise) return messagingPromise;

  messagingPromise = (async () => {
    try {
      const messagingModule = await import("firebase/messaging");
      const { getMessaging, isSupported } = messagingModule;

      if (!("serviceWorker" in navigator) || !("Notification" in window)) return null;
      if (!(await isSupported())) return null;

      const registration = await navigator.serviceWorker.ready.catch(() => null);
      if (!registration?.active) {
        console.warn("Service worker not active");
        return null;
      }

      messagingInstance = getMessaging(app);
      return messagingInstance;
    } catch (e) {
      console.error("Get messaging failed:", e);
      return null;
    }
  })();

  return messagingPromise;
};

/* ================= ANALYTICS ================= */
let analyticsInstance: Analytics | null = null;
let analyticsPromise: Promise<Analytics | null> | null = null;

export const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (typeof window === "undefined") return null;
  if (analyticsInstance) return analyticsInstance;
  if (analyticsPromise) return analyticsPromise;

  analyticsPromise = (async () => {
    try {
      if (await isAnalyticsSupported()) {
        analyticsInstance = getAnalytics(app);
        return analyticsInstance;
      }
    } catch (e) {
      console.error("Analytics failed:", e);
    }
    return null;
  })();

  return analyticsPromise;
};

/* ================= FCM TOKEN ================= */
export const getFCMToken = async (vapidKey: string, retries = 3): Promise<string | null> => {
  const msg = await getMessagingInstance();
  if (!msg) return null;

  const { getToken } = await import("firebase/messaging");

  for (let i = 0; i < retries; i++) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const token = await getToken(msg, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (token) return token;
    } catch (e) {
      console.error(`Get FCM token attempt ${i + 1}:`, e);
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  return null;
};

/* ================= FOREGROUND MESSAGE ================= */
export const onForegroundMessage = (
  callback: (payload: MessagePayloadType) => void
): (() => void) => {
  let unsubscribe: (() => void) | null = null;

  getMessagingInstance().then(async (msg) => {
    if (!msg) return;

    const { onMessage } = await import("firebase/messaging");
    unsubscribe = onMessage(msg, callback);
  });

  return () => unsubscribe?.();
};

/* ================= EXPORTS ================= */
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
