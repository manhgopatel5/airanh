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
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  runTransaction,
  arrayUnion,
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
  sessions?: Session[];
};

export type Session = {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: any;
  current: boolean;
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

// =========================
// 📱 TRACK SESSION HELPER
// =========================
const trackCurrentSession = async (uid: string, db: any) => {
  try {
    // 1. Parse UA
    const parser = new UAParser();
    const result = parser.getResult();
    const device = `${result.device.vendor || ""} ${result.device.model || result.os.name}`.trim() || "Unknown Device";
    const browser = `${result.browser.name} ${result.browser.version || ""}`.trim();
    const os = `${result.os.name} ${result.os.version || ""}`.trim();

    // 2. Get IP + Location
    let ip = "Unknown";
    let location = "Unknown";
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      ip = data.ip || "Unknown";
      location = `${data.city}, ${data.country_name}` || "Unknown";
    } catch {}

    // 3. Tạo session ID unique
    const sessionId = `${uid}_${btoa(navigator.userAgent).slice(0, 20)}_${Date.now()}`;

    const currentSession: Session = {
      id: sessionId,
      device,
      browser,
      os,
      ip,
      location,
      lastActive: new Date(),
      current: true,
    };

    // 4. Update Firestore: set tất cả session cũ current = false, add session mới
    const userRef = doc(db, "users", uid);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const sessions = (data.sessions || []) as Session[];

      // Bỏ flag current ở session cũ
      const updatedSessions = sessions.map((s) => ({...s, current: false }));

      // Check xem device này đã có session chưa
      const existingIdx = updatedSessions.findIndex(
        (s) => s.device === device && s.browser === browser && s.os === os
      );

      if (existingIdx >= 0) {
        // Update session cũ thành current
        updatedSessions[existingIdx] = {
         ...updatedSessions[existingIdx],
          current: true,
          lastActive: new Date(),
          ip,
          location,
        };
      } else {
        // Add session mới
        updatedSessions.push(currentSession);
      }

      tx.update(userRef, { sessions: updatedSessions });
    });

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
    if (!auth ||!db ||!rtdb) return;

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
            // TẠO USER MỚI
            console.log("Tạo user mới cho:", firebaseUser.uid);
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
                sessions: [], // Khởi tạo rỗng
              };

              tx.set(userRef, newUser);
              tx.set(doc(db, "usernames", username), { uid: firebaseUser.uid });
              console.log("Tạo user xong:", userId, username);
            });
          }

          // TRACK SESSION SAU KHI LOGIN
          await trackCurrentSession(firebaseUser.uid, db);

          // Update isOnline
          await updateDoc(userRef, {
            isOnline: true,
            lastSeen: serverTimestamp(),
            emailVerified: firebaseUser.emailVerified,
          });

          const handleVisibility = () => {
            if (document.visibilityState === "hidden") {
              updateDoc(userRef, {
                isOnline: false,
                lastSeen: serverTimestamp()
              }).catch(() => {});
            } else {
              updateDoc(userRef, { isOnline: true }).catch(() => {});
              // Update lastActive của session hiện tại
              trackCurrentSession(firebaseUser.uid, db);
            }
          };
          document.addEventListener("visibilitychange", handleVisibility);
          visibilityHandlerRef.current = handleVisibility;

          const handleBeforeUnload = () => {
            updateDoc(userRef, {
              isOnline: false,
              lastSeen: serverTimestamp()
            }).catch(() => {});
          };
          window.addEventListener("beforeunload", handleBeforeUnload);
          beforeUnloadHandlerRef.current = handleBeforeUnload;

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
      if (visibilityHandlerRef.current) {
        document.removeEventListener("visibilitychange", visibilityHandlerRef.current);
      }
      if (beforeUnloadHandlerRef.current) {
        window.removeEventListener("beforeunload", beforeUnloadHandlerRef.current);
      }
      if (auth?.currentUser) {
        updateDoc(doc(db, "users", auth.currentUser.uid), {
          isOnline: false,
          lastSeen: serverTimestamp()
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
    if (user) {
      try {
        // Set session hiện tại current = false khi logout
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const sessions = (snap.data().sessions || []) as Session[];
          const updated = sessions.map((s) =>
            s.current? {...s, current: false, lastActive: new Date() } : s
          );
          await updateDoc(userRef, {
            sessions: updated,
            isOnline: false,
            lastSeen: serverTimestamp(),
          });
        }
      } catch {}
    }
    await auth.signOut();
  };
};