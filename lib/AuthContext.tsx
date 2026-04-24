"use client";

import { createContext, useEffect, useState, useRef, useMemo, ReactNode, useContext } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB, getFirebaseRTDB } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbTimestamp } from "firebase/database";
import { nanoid } from "nanoid";

/* ================= TYPES ================= */
export type AppUser = {
  uid: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  avatar: string;
  shortId: string;
  isOnline: boolean;
  lastSeen: Timestamp;
  fcmTokens?: string[];
};

type AuthContextType = {
  user: User | null;
  userData: AppUser | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  error: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const rtdb = getFirebaseRTDB();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userDataUnsub = useRef<(() => void) | null>(null);
  const presenceUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUser(firebaseUser);
        setError(null);

        if (userDataUnsub.current) {
          userDataUnsub.current();
          userDataUnsub.current = null;
        }
        if (presenceUnsub.current) {
          presenceUnsub.current();
          presenceUnsub.current = null;
        }

        if (!firebaseUser) {
          setUserData(null);
          setLoading(false);
          return;
        }

        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(userRef);

          if (!snap.exists()) {
            // Tạo user mới trong transaction để tránh race condition
            await runTransaction(db, async (transaction) => {
              // Tạo shortId unique
              let shortId = "";
              for (let i = 0; i < 5; i++) {
                shortId = nanoid(8).toUpperCase();
                const q = await transaction.get(doc(db, "shortIds", shortId));
                if (!q.exists()) break;
                if (i === 4) throw new Error("Không thể tạo shortId");
              }

              // Tạo username unique
              const emailPrefix = firebaseUser.email?.split("@")[0] || "user";
              const baseUsername = emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
              let username = baseUsername;
              let suffix = 0;

              while (true) {
                const q = await transaction.get(doc(db, "usernames", username));
                if (!q.exists()) break;
                suffix++;
                username = `${baseUsername}${suffix}`;
                if (suffix > 100) throw new Error("Không thể tạo username");
              }

              const newUser: AppUser = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
                username,
                email: firebaseUser.email || "",
                emailVerified: firebaseUser.emailVerified,
                avatar:
                  firebaseUser.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.email || "U")}&background=random`,
                shortId,
                isOnline: true,
                lastSeen: serverTimestamp() as Timestamp,
                fcmTokens: [],
              };

              transaction.set(userRef, newUser);
              transaction.set(doc(db, "shortIds", shortId), { uid: firebaseUser.uid });
              transaction.set(doc(db, "usernames", username), { uid: firebaseUser.uid });
            });
          } else {
            await updateDoc(userRef, {
              isOnline: true,
              lastSeen: serverTimestamp(),
              emailVerified: firebaseUser.emailVerified,
            });
          }

          userDataUnsub.current = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserData({...docSnap.data() } as AppUser);
            }
          });

          // ================= PRESENCE =================
          const userStatusRef = ref(rtdb, `/status/${firebaseUser.uid}`);
          const connectedRef = ref(rtdb, ".info/connected");

          presenceUnsub.current = onValue(connectedRef, (snap) => {
            if (snap.val() === false) return;

            onDisconnect(userStatusRef)
             .set({
                isOnline: false,
                lastSeen: rtdbTimestamp(),
              })
             .then(() => {
                set(userStatusRef, {
                  isOnline: true,
                  lastSeen: rtdbTimestamp(),
                });
              });
          });

        } catch (e: any) {
          console.error("Auth error:", e);
          setError(e.message || "Lỗi khởi tạo tài khoản");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("onAuthStateChanged error:", err);
        setError("Lỗi xác thực");
        setLoading(false);
      }
    );

    return () => {
      unsubAuth();
      if (userDataUnsub.current) userDataUnsub.current();
      if (presenceUnsub.current) presenceUnsub.current();
    };
  }, []);

  const value = useMemo(
    () => ({ user, userData, loading, error }),
    [user, userData, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// ================= LOGOUT =================
export const useLogout = () => {
  const auth = getFirebaseAuth(); // ✅ Fix: lấy auth ở đây
  const db = getFirebaseDB();

  return async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        // Set offline trước khi signOut
        await updateDoc(doc(db, "users", user.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch {}
    }
    await auth.signOut();
  };
};