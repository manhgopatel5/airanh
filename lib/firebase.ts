"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getDatabase, Database } from "firebase/database";

/* ================= CONFIG ================= */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  ...(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL && {
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  }),
};

/* ================= INIT APP ================= */
// Chặn SSR: Chỉ init khi có window
const app: FirebaseApp = typeof window === "undefined" 
  ? (null as any)
  : getApps().length 
    ? getApp() 
    : initializeApp(firebaseConfig);

/* ================= EXPORT INSTANCES ================= */
// ✅ Export thẳng instance, không cần getter
export const auth: Auth = typeof window !== "undefined" ? getAuth(app) : (null as any);
export const db: Firestore = typeof window !== "undefined" ? getFirestore(app) : (null as any);
export const storage: FirebaseStorage = typeof window !== "undefined" ? getStorage(app) : (null as any);
export const rtdb: Database | null = 
  typeof window !== "undefined" && firebaseConfig.databaseURL 
    ? getDatabase(app) 
    : null;

/* ================= SET PERSISTENCE ================= */
// Lưu login vào localStorage, chạy 1 lần duy nhất
if (typeof window !== "undefined" && auth) {
  setPersistence(auth, browserLocalPersistence).catch((err) => 
    console.error("Auth persistence failed:", err)
  );
}