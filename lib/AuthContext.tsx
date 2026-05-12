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
} from "firebase/firestore";
import {
  ref,
  onValue,
  set,
  onDisconnect,
  serverTimestamp as rtdbTimestamp,
} from "firebase/database";
import { nanoid } from "nanoid";
import { useRouter, usePathname } from "next/navigation";

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
  // Thêm field ban
  banned?: boolean;
  bannedUntil?: Timestamp | null;
  bannedReason?: string;
  bannedAt?: Timestamp;
  bannedBy?: string;
  violationCount?: number;
  warning?: boolean;
  warningReason?: string;
  warningAt?: Timestamp;
  lastViolationAt?: Timestamp;
  unbannedAt?: Timestamp;
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

  const router = useRouter();
  const pathname = usePathname();

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
                banned: false,
                violationCount: 0,
              };

              tx.set(userRef, newUser);
              tx.set(doc(db, "usernames", username), { uid: firebaseUser.uid });
              console.log("Tạo user xong:", userId, username);
            });
          } else {
            // USER CŨ
            const data = snap.data() as AppUser;
            console.log("User đã có:", data.userId);

            const usernameDoc = await getDoc(doc(db, "usernames", data.username));
            if (!usernameDoc.exists()) {
              console.log("Thiếu usernames, tạo lại:", data.username);
              await setDoc(doc(db, "usernames", data.username), { uid: firebaseUser.uid });
            }

            await updateDoc(userRef, {
              isOnline: true,
              lastSeen: serverTimestamp(),
              emailVerified: firebaseUser.emailVerified,
            });
          }

          const handleVisibility = () => {
            if (document.visibilityState === "hidden") {
              updateDoc(userRef, { 
                isOnline: false, 
                lastSeen: serverTimestamp() 
              }).catch(() => {});
            } else {
              updateDoc(userRef, { isOnline: true }).catch(() => {});
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
            async (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data() as AppUser;
                
                // CHECK BAN - TỰ UNBAN NẾU HẾT HẠN
                if (data.banned) {
                  if (!data.bannedUntil) {
                    // Ban vĩnh viễn
                    if (pathname !== "/banned") router.push("/banned");
                  } else {
                    const banEndDate = data.bannedUntil.toDate();
                    if (banEndDate < new Date()) {
                      // Hết hạn → tự unban
                      await updateDoc(userRef, {
                        banned: false,
                        bannedUntil: null,
                        unbannedAt: serverTimestamp()
                      });
                      console.log("Auto unbanned:", firebaseUser.uid);
                    } else {
                      // Vẫn đang bị ban
                      if (pathname !== "/banned") {
                        router.push(`/banned?until=${banEndDate.getTime()}`);
                      }
                    }
                  }
                }
                
                setUserData(data);
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
  }, [auth, db, rtdb, pathname, router]);

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