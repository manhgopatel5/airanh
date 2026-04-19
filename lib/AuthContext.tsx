"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase.client";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { initFCM } from "@/lib/fcm"; // 🔥 thêm

type AuthContextType = {
  user: User | null | undefined;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  loading: true,
});

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null | undefined>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("user");
      return cached ? JSON.parse(cached) : undefined;
    }
    return undefined;
  });

  const [loading, setLoading] = useState(true);

  // 🔥 FIX: chống initFCM nhiều lần
  const lastFcmUserRef = useRef<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("🔥 AUTH STATE:", firebaseUser);

      setUser(firebaseUser);
      setLoading(false);

      // 🔥 CACHE USER
      if (typeof window !== "undefined") {
        if (firebaseUser) {
          localStorage.setItem("user", JSON.stringify(firebaseUser));
        } else {
          localStorage.removeItem("user");
        }
      }

      // 🔥 INIT FCM CHUẨN (KHÔNG X2, KHÔNG MẤT)
      if (firebaseUser?.uid) {
        if (lastFcmUserRef.current !== firebaseUser.uid) {
          lastFcmUserRef.current = firebaseUser.uid;
          initFCM(firebaseUser.uid);
        }
      }

      // 🔥 FIRESTORE USER
      if (firebaseUser) {
        const ref = doc(db, "users", firebaseUser.uid);

        getDoc(ref)
          .then((snap) => {
            if (!snap.exists()) {
              setDoc(ref, {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || "User",
                email: firebaseUser.email || "",
                avatar: firebaseUser.photoURL || "",
                friends: [],
                isOnline: true,
                createdAt: serverTimestamp(),
              });
            } else {
              updateDoc(ref, { isOnline: true });
            }
          })
          .catch(console.error);
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
