import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔐 CONFIG (ENV - CHUẨN PRODUCTION)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!, // ✅ FIX bucket
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// 🚀 INIT APP (tránh init nhiều lần)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 🔥 SERVICES
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// 📦 EXPORT
export { app, auth, db, storage, serverTimestamp };