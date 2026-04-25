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
  userId: string;
  email: string;
  emailVerified: boolean;
  avatar: string;
  isOnline: boolean;
  lastSeen: Timestamp;
  fcmTokens?: string[];
  status: "active" | "banned" | "deleted" | "deactivated"; // ✅ Thêm status
  searchKeywords: string[]; // ✅ Thêm searchKeywords
  nameLower: string; // ✅ Thêm để sort
  bio?: string;
  hidden?: boolean;
  deletedAt?: any;
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

// ✅ Helper tạo searchKeywords từ name + userId + username
const generateSearchKeywords = (name: string, userId: string, username?: string): string[] => {
  const keywords = new Set<string>();

  const nameLower = name.toLowerCase().trim();
  if (nameLower) {
    keywords.add(nameLower); // "mạnh nguyễn"
    keywords.add(nameLower.replace(/\s+/g, "")); // "mạnhnguyễn"

    // Bỏ dấu tiếng Việt
    const noDiacritics = nameLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    keywords.add(noDiacritics); // "manh nguyen"
    keywords.add(noDiacritics.replace(/\s+/g, "")); // "manhnguyen"

    // Từng từ riêng
    nameLower.split(" ").forEach(word => {
      if (word.length >= 2) keywords.add(word);
    });
  }

  // UserId + username
  keywords.add(userId.toLowerCase());
  if (username) keywords.add(username.toLowerCase());

  return Array.from(keywords).filter(k => k.length >= 2);
};

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
              // Tạo userId unique - 8 ký tự
              let userId = "";
              for (let i = 0; i < 5; i++) {
                userId = nanoid(8).toUpperCase();
                const q = await transaction.get(doc(db, "userIds", userId));
                if (!q.exists()) break;
                if (i === 4) throw new Error("Không thể tạo userId");
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

              const name = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User";
              const searchKeywords = generateSearchKeywords(name, userId, username);

              const newUser: AppUser = {
                uid: firebaseUser.uid,
                name: name,
                nameLower: name.toLowerCase(), // ✅ Thêm để sort
                username,
                userId,
                email: firebaseUser.email || "",
                emailVerified: firebaseUser.emailVerified,
                avatar:
                  firebaseUser.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                bio: "",
                isOnline: true,
                lastSeen: serverTimestamp() as Timestamp,
                fcmTokens: [],
                status: "active", // ✅ Thêm status mặc định
                searchKeywords: searchKeywords, // ✅ Thêm searchKeywords
                hidden: false,
                deletedAt: null,
              };

              transaction.set(userRef, newUser);
              transaction.set(doc(db, "userIds", userId), { uid: firebaseUser.uid });
              transaction.set(doc(db, "usernames", username), { uid: firebaseUser.uid });
            });
          } else {
            // ✅ Update user cũ: thêm status + searchKeywords nếu thiếu
            const existingData = snap.data();
            const updates: any = {
              isOnline: true,
              lastSeen: serverTimestamp(),
              emailVerified: firebaseUser.emailVerified,
            };

            // Thêm status nếu chưa có
            if (!existingData.status) {
              updates.status = "active";
            }

            // Thêm searchKeywords nếu chưa có
            if (!existingData.searchKeywords || existingData.searchKeywords.length === 0) {
              updates.searchKeywords = generateSearchKeywords(
                existingData.name,
                existingData.userId,
                existingData.username
              );
            }

            // Thêm nameLower nếu chưa có
            if (!existingData.nameLower) {
              updates.nameLower = existingData.name.toLowerCase();
            }

            await updateDoc(userRef, updates);
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
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();

  return async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch {}
    }
    await auth.signOut();
  };
};