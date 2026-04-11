import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

export const storage = getStorage(app);
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-mUYa7_t4lrePwI5GGCYWGxnKcGOzc_0",
  authDomain: "airanh-ba64c.firebaseapp.com",
  projectId: "airanh-ba64c",
  storageBucket: "airanh-ba64c.firebasestorage.app",
  messagingSenderId: "236839124077",
  appId: "1:236839124077:web:bcf03a9721d45386f2d364",
  measurementId: "G-L8WCT3BRWJ"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 👇 QUAN TRỌNG NHẤT
export { app };

export const auth = getAuth(app);
export const db = getFirestore(app);
