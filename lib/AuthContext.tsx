"use client";

import {
  createContext,
  useEffect,
  useState,
  useRef,
  useMemo,
  ReactNode,
  useContext,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import {
  ref,
  onValue,
  set,
  onDisconnect,
  serverTimestamp as rtdbTimestamp,
} from "firebase/database";
import { nanoid } from "nanoid";

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
  status: "active" | "banned" | "deleted" | "deactivated";
  searchKeywords: string[];
  nameLower: string;
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

const generateSearchKeywords = (
  name: string,
  userId: string,
  username?: string
): string[] => {
  const keywords = new Set<string>();
  const nameLower = name.toLowerCase().trim();

  if (nameLower) {
    keywords.add(nameLower);
    keywords.add(nameLower.replace(/\s+/g, ""));
    const no = nameLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    keywords.add(no);
    keywords.add(no.replace(/\s+/g, ""));
    nameLower.split(" ").forEach((w) => {
      if (w.length >= 2) keywords.add(w);
    });
  }

  keywords.add(userId.toLowerCase());
  if (username) keywords.add(username.toLowerCase());
  return Array.from(keywords).filter((k) => k.length >= 2);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<any>(null);
  const [db, setDb] = useState<any>(null);
  const [rtdb, setRtdb] = useState<any>(null);

  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userDataUnsub = useRef<(() => void) | null>(null);
  const presenceUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    const init = async () => {
      const firebase = await import("@/lib/firebase");
      setAuth(firebase.getFirebaseAuth());
      setDb(firebase.getFirebaseDB());
      setRtdb(firebase.getFirebaseRTDB());
    };
    init();
  }, []);

  useEffect(() => {
    if (!auth || !db || !rtdb) return;

    const unsubAuth = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUser(firebaseUser);
        setError(null);

        if (userDataUnsub.current) userDataUnsub.current();
        if (presenceUnsub.current) presenceUnsub.current();

        if (!firebaseUser) {
          setUserData(null);
          setLoading(false);
          return;
        }

        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(userRef);

          if (!snap.exists()) {
            console.log("Tạo user mới cho:", firebaseUser.uid);
            await runTransaction(db, async (tx) => {
              let userId = "";
              for (let i = 0; i < 5; i++) {
                userId = `AIR${nanoid(6).toUpperCase()}`;
                const q = await tx.get(doc(db, "userIds", userId));
                if (!q.exists()) break;
              }

              const email = firebaseUser.email || "";
              const name =
                firebaseUser.displayName || email.split("@")[0] || "User";

              let baseUsername = name
                .toLowerCase()
                .replace(/\s+/g, "")
                .replace(/[^a-z0-9]/g, "");
              if (!baseUsername) baseUsername = "user";
              let username = baseUsername;
              let counter = 1;

              while (true) {
                const usernameDoc = await tx.get(doc(db, "usernames", username));
                if (!usernameDoc.exists()) break;
                username = `${baseUsername}${counter}`;
                counter++;
                if (counter > 100) throw new Error("Không tạo được username");
              }

              const searchKeywords = generateSearchKeywords(
                name,
                userId,
                username
              );

              const newUser: AppUser = {
                uid: firebaseUser.uid,
                name, // FIX: THÊM DÒNG NÀY
                nameLower: name.toLowerCase(),
                username,
                userId,
                emailVerified: firebaseUser.emailVerified,
                avatar:
                  firebaseUser.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    name
                  )}&background=random`,
                bio: "",
                isOnline: true,
                lastSeen: serverTimestamp() as Timestamp,
                fcmTokens: [],
                status: "active",
                searchKeywords,
                hidden: false,
                deletedAt: null,
              };

              tx.set(userRef, newUser);
              tx.set(doc(db, "userIds", userId), { uid: firebaseUser.uid });
              tx.set(doc(db, "usernames", username), { uid: firebaseUser.uid });
              console.log("Tạo user xong:", userId, username);
            });
          } else {
            await updateDoc(userRef, {
              isOnline: true,
              lastSeen: serverTimestamp(),
              emailVerified: firebaseUser.emailVerified,
            });
          }

          userDataUnsub.current = onSnapshot(
            userRef,
            (docSnap) => {
              if (docSnap.exists()) {
                setUserData(docSnap.data() as AppUser);
                console.log("userData loaded:", docSnap.data().userId);
              }
              setLoading(false);
            },
            (err) => {
              console.error("Snapshot error:", err);
              setError(err.message);
              setLoading(false);
            }
          );

          const statusRef = ref(rtdb, `/status/${firebaseUser.uid}`);
          const connectedRef = ref(rtdb, ".info/connected");

          presenceUnsub.current = onValue(connectedRef, (snap) => {
            if (!snap.val()) return;
            onDisconnect(statusRef).set({
              isOnline: false,
              lastSeen: rtdbTimestamp(),
            });
            set(statusRef, {
              isOnline: true,
              lastSeen: rtdbTimestamp(),
            });
          });
        } catch (e: any) {
          console.error("Auth error:", e);
          setError(e.message);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Auth error:", err);
        setError("Lỗi xác thực");
        setLoading(false);
      }
    );

    return () => {
      unsubAuth();
      if (userDataUnsub.current) userDataUnsub.current();
      if (presenceUnsub.current) presenceUnsub.current();
    };
  }, [auth, db, rtdb]);

  const value = useMemo(
    () => ({ user, userData, loading, error }),
    [user, userData, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export const useLogout = () => {
  return async () => {
    const firebase = await import("@/lib/firebase");
    const auth = firebase.getFirebaseAuth();
    const db = firebase.getFirebaseDB();
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