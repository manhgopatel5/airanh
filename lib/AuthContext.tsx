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
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import {
  ref,
  onValue,
  set,
  onDisconnect,
  serverTimestamp as rtdbTimestamp,
} from "firebase/database";
import { nanoid } from "nanoid";
import { UAParser } from "ua-parser-js";

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

export type Session = {
  id: string;
  uid: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: Timestamp;
  createdAt: Timestamp;
  current: boolean;
  userAgent: string;
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

const SESSION_KEY = "airanh_session_id";

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

const trackCurrentSession = async (uid: string, db: any) => {
  try {
    const parser = new UAParser();
    const result = parser.getResult();
    const device = `${result.device.vendor || ""} ${result.device.model || result.os.name}`.trim() || "Unknown Device";
    const browser = `${result.browser.name} ${result.browser.version || ""}`.trim();
    const os = `${result.os.name} ${result.os.version || ""}`.trim();
    const userAgent = navigator.userAgent;

    let ip = "Unknown";
    let location = "Unknown";
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      ip = data.ip || "Unknown";
    } catch {}

    let sessionId = localStorage.getItem(SESSION_KEY);
    const sessionsRef = collection(db, "sessions");

    if (sessionId) {
      const sessionRef = doc(db, "sessions", sessionId);
      const snap = await getDoc(sessionRef);
      if (snap.exists() && snap.data().uid === uid) {
        await updateDoc(sessionRef, {
          lastActive: serverTimestamp(),
          current: true,
          ip,
          location,
        });
      } else {
        sessionId = null;
        localStorage.removeItem(SESSION_KEY);
      }
    }

    if (!sessionId) {
      const docRef = await addDoc(sessionsRef, {
        uid,
        device,
        browser,
        os,
        ip,
        location,
        userAgent,
        lastActive: serverTimestamp(),
        createdAt: serverTimestamp(),
        current: true,
      });
      sessionId = docRef.id;
      localStorage.setItem(SESSION_KEY, sessionId);
    }

    const q = query(sessionsRef, where("uid", "==", uid), where("current", "==", true));
    const snap = await getDocs(q);
    const updates = snap.docs
      .filter((d) => d.id !== sessionId)
      .map((d) => updateDoc(d.ref, { current: false }));
    await Promise.all(updates);

    console.log("Tracked session:", device);
  } catch (err) {
    console.error("Track session error:", err);
  }
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
  const visibilityHandlerRef = useRef<(() => void) | null>(null);
  const beforeUnloadHandlerRef = useRef<(() => void) | null>(null);

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
        if (visibilityHandlerRef.current) {
          document.removeEventListener("visibilitychange", visibilityHandlerRef.current);
          visibilityHandlerRef.current = null;
        }
        if (beforeUnloadHandlerRef.current) {
          window.removeEventListener("beforeunload", beforeUnloadHandlerRef.current);
          beforeUnloadHandlerRef.current = null;
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
            await runTransaction(db, async (tx) => {
              let userId = "";
              for (let i = 0; i < 5; i++) {
                userId = `AIR${nanoid(6).toUpperCase()}`;
                const q = await tx.get(doc(db, "users", firebaseUser.uid));
                if (!q.exists()) break;
              }

              const email = firebaseUser.email || "";
              const name = firebaseUser.displayName || email.split("@")[0] || "User";

              let baseUsername = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
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

              const searchKeywords = generateSearchKeywords(name, userId, username);

              const newUser: AppUser = {
                uid: firebaseUser.uid,
                name: name,
                nameLower: name.toLowerCase(),
                username,
                userId,
                email: firebaseUser.email || "",
                emailVerified: firebaseUser.emailVerified,
                avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
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
              tx.set(doc(db, "usernames", username), { uid: firebaseUser.uid });
            });
          }

          // 1. TRACK SESSION TRƯỚC
          await trackCurrentSession(firebaseUser.uid, db);

          // 2. UPDATE ONLINE STATUS
          await updateDoc(userRef, {
            isOnline: true,
            lastSeen: serverTimestamp(),
            emailVerified: firebaseUser.emailVerified,
          });

          // 3. SETUP LISTENERS
          const handleVisibility = () => {
            if (document.visibilityState === "hidden") {
              updateDoc(userRef, {
                isOnline: false,
                lastSeen: serverTimestamp(),
              }).catch(() => {});
            } else {
              updateDoc(userRef, { isOnline: true }).catch(() => {});
              trackCurrentSession(firebaseUser.uid, db);
            }
          };
          document.addEventListener("visibilitychange", handleVisibility);
          visibilityHandlerRef.current = handleVisibility;

          const handleBeforeUnload = () => {
            updateDoc(userRef, {
              isOnline: false,
              lastSeen: serverTimestamp(),
            }).catch(() => {});
          };
          window.addEventListener("beforeunload", handleBeforeUnload);
          beforeUnloadHandlerRef.current = handleBeforeUnload;

          // 4. SNAPSHOT USER DATA - TẮT LOADING Ở ĐÂY
          userDataUnsub.current = onSnapshot(
            userRef,
            (docSnap) => {
              if (docSnap.exists()) {
                setUserData(docSnap.data() as AppUser);
                console.log("userData loaded:", docSnap.data().userId);
              }
              setLoading(false); // QUAN TRỌNG: Tắt loading sau khi có userData
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
      if (visibilityHandlerRef.current) {
        document.removeEventListener("visibilitychange", visibilityHandlerRef.current);
      }
      if (beforeUnloadHandlerRef.current) {
        window.removeEventListener("beforeunload", beforeUnloadHandlerRef.current);
      }
      if (auth?.currentUser) {
        updateDoc(doc(db, "users", auth.currentUser.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        }).catch(() => {});
      }
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
    const sessionId = localStorage.getItem(SESSION_KEY);

    if (user && sessionId) {
      try {
        await deleteDoc(doc(db, "sessions", sessionId));
        localStorage.removeItem(SESSION_KEY);
      } catch {}
    }

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