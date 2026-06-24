

import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  
} from "firebase/auth";
import {
  getFirestore,
  
} from "firebase/firestore";
import {
  getStorage,
  
} from "firebase/storage";
import {
  getDatabase,
  
} from "firebase/database";

const firebaseConfig: FirebaseOptions = {
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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestoreDb = getFirestore(app);
const storage = getStorage(app);
const rtdb = firebaseConfig.databaseURL ? getDatabase(app) : null;

// Set ngôn ngữ + persistence chỉ ở client
if (typeof window !== "undefined") {
  auth.languageCode = 'vi';
  setPersistence(auth, browserLocalPersistence).catch((err) => 
    console.error("Auth persistence failed:", err)
  );
}

/* ================= EXPORTS ================= */

export const db = firestoreDb;
export const firebaseApp = app;

// Getter functions
export const getFirebaseApp = () => app;
export const getFirebaseAuth = () => auth;
export const getFirebaseDB = () => firestoreDb;
export const getFirebaseStorage = () => storage;
export const getFirebaseRTDB = () => {
  if (!rtdb) throw new Error("RTDB not initialized");
  return rtdb;
};