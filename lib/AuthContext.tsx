"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

type AuthContextType = {
  user: User | null | undefined; // 🔥 FIX: thêm undefined
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: undefined, // 🔥 FIX
  loading: true,
});

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null | undefined>(() => {
    // 🔥 LOAD CACHE NGAY
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("user");
      return cached ? JSON.parse(cached) : undefined; // 🔥 FIX
    }
    return undefined; // 🔥 FIX
  });

  const [loading, setLoading] = useState(true); // 🔥 FIX

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("🔥 AUTH STATE:", firebaseUser);

      setUser(firebaseUser);
      setLoading(false);

      // 🔥 CACHE USER (FIX THÊM)
      if (typeof window !== "undefined") {
        if (firebaseUser) {
          localStorage.setItem("user", JSON.stringify(firebaseUser));
        } else {
          localStorage.removeItem("user");
        }
      }

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
