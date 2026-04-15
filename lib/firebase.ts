import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/* 🔥 CONFIG */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: "airanh-ba64c.appspot.com", // ✅ FIX
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

/* 🚀 INIT (FIX DUPLICATE APP) */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/* 🔐 AUTH */
const auth = getAuth(app);

/* 🔥 FIX SSR ERROR */
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence);
}

/* 🔥 DB + STORAGE */
const db = getFirestore(app);
const storage = getStorage(app);

/* 📦 EXPORT */
export { app, auth, db, storage, serverTimestamp };
