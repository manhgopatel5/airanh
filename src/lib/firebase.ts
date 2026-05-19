"use client";

import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  Auth,
} from "firebase/auth";
import {
  getFirestore,
  Firestore,
} from "firebase/firestore";
import {
  getStorage,
  FirebaseStorage,
} from "firebase/storage";
import {
  getDatabase,
  Database,
} from "firebase/database";

/* ================= CONFIG ================= */

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

/* ================= SINGLETONS ================= */

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let rtdb: Database | null = null;

/* ================= INIT ================= */

function initFirebase() {
  if (typeof window === "undefined") return;

  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    if (firebaseConfig.databaseURL) {
      rtdb = getDatabase(app);
    }

    // Lưu login
    setPersistence(auth, browserLocalPersistence).catch((err) => 
      console.error("Auth persistence failed:", err)
    );
  }
}

/* ================= GETTERS ================= */

export function getFirebaseApp(): FirebaseApp {
  initFirebase();
  if (!app) throw new Error("Firebase not initialized");
  return app;
}

export function getFirebaseAuth(): Auth {
  initFirebase();
  if (!auth) throw new Error("Auth not initialized");
  return auth;
}

export function getFirebaseDB(): Firestore {
  initFirebase();
  if (!db) throw new Error("Firestore not initialized");
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  initFirebase();
  if (!storage) throw new Error("Storage not initialized");
  return storage;
}

export function getFirebaseRTDB(): Database {
  initFirebase();
  if (!rtdb) throw new Error("RTDB not initialized. Check NEXT_PUBLIC_FIREBASE_DATABASE_URL");
  return rtdb;
}