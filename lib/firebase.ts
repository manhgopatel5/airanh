import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-mUYa7_t4IrePwI5GGCYWGxnKcG0zc_0",
  authDomain: "airanh-ba64c.firebaseapp.com",
  projectId: "airanh-ba64c",
  storageBucket: "airanh-ba64c.firebasestorage.app",
  messagingSenderId: "236839124077",
  appId: "1:236839124077:web:bcf03a9721d45386f2d364",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
