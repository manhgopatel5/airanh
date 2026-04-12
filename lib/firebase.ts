import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔥 config
const firebaseConfig = {
  apiKey: "AIzaSyB-mUYa7_t4lrePwI5GGCYWGxnKcGOzc_0",
  authDomain: "airanh-ba64c.firebaseapp.com",
  projectId: "airanh-ba64c",
  storageBucket: "airanh-ba64c.firebasestorage.app",
  messagingSenderId: "236839124077",
  appId: "1:236839124077:web:bcf03a9721d45386f2d364",
  measurementId: "G-L8WCT3BRWJ",
};

// ✅ KHỞI TẠO APP TRƯỚC
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ EXPORT
export { app };

// ✅ INIT SAU KHI CÓ app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);