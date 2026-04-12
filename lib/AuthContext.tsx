"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

/* ================= TYPES ================= */

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

/* ================= CONTEXT ================= */

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

/* ================= PROVIDER ================= */

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const ref = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(ref);

          // ✅ Nếu chưa có user → tạo mới
          if (!snap.exists()) {
            await setDoc(ref, {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || "User",
              email: firebaseUser.email || "",
              avatar: firebaseUser.photoURL || "",
              friends: [],
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error("Lỗi tạo user:", err);
        }
      }

      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

/* ================= HOOK ================= */

export const useAuth = () => useContext(AuthContext);
