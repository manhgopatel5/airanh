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

import { nanoid } from "nanoid";
import { useRouter, usePathname } from "next/navigation";

export type AppUser = {
  uid: string;
  name: string;
  username: string;
  userId: string;
  email: string;
  warningSeen?: boolean; 
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
  warningTitle?: string; 
  warningMessage?: string; 

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

    const noAccent = nameLower
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    keywords.add(noAccent);

    keywords.add(noAccent.replace(/\s+/g, ""));

    nameLower.split(" ").forEach((w) => {
      if (w.length >= 2) keywords.add(w);
    });
  }

  keywords.add(userId.toLowerCase());

  if (username) {
    keywords.add(username.toLowerCase());
  }

  return Array.from(keywords).filter((k) => k.length >= 2);
};

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
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

  const visibilityHandlerRef = useRef<any>(null);
  const beforeUnloadHandlerRef = useRef<any>(null);
  const warningToastShown = useRef<string | null>(null);

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

        if (userDataUnsub.current) {
          userDataUnsub.current();
        }

        if (presenceUnsub.current) {
          presenceUnsub.current();
        }

        if (visibilityHandlerRef.current) {
          document.removeEventListener(
            "visibilitychange",
            visibilityHandlerRef.current
          );

          visibilityHandlerRef.current = null;
        }

        if (beforeUnloadHandlerRef.current) {
          window.removeEventListener(
            "beforeunload",
            beforeUnloadHandlerRef.current
          );

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

          // CREATE USER
          if (!snap.exists()) {
            console.log("Creating new user:", firebaseUser.uid);

            await runTransaction(db, async (tx) => {
              let userId = "";

              for (let i = 0; i < 10; i++) {
                userId = `AIR${nanoid(6).toUpperCase()}`;

                const existingId = await getDoc(
                  doc(db, "userIds", userId)
                );

                if (!existingId.exists()) {
                  break;
                }
              }

              if (!userId) {
                throw new Error("Cannot generate userId");
              }

              const email = firebaseUser.email || "";

              const name =
                firebaseUser.displayName ||
                email.split("@")[0] ||
                "User";

              let baseUsername = name
                .toLowerCase()
                .replace(/\s+/g, "")
                .replace(/[^a-z0-9]/g, "");

              if (!baseUsername) {
                baseUsername = "user";
              }

              let username = baseUsername;

              let counter = 1;

              while (true) {
                const usernameDoc = await tx.get(
                  doc(db, "usernames", username)
                );

                if (!usernameDoc.exists()) {
                  break;
                }

                username = `${baseUsername}${counter}`;

                counter++;

                if (counter > 100) {
                  throw new Error("Không tạo được username");
                }
              }

              const searchKeywords = generateSearchKeywords(
                name,
                userId,
                username
              );

              const newUser: AppUser = {
                uid: firebaseUser.uid,

                name,

                username,

                userId,

                email: firebaseUser.email || "",

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

                nameLower: name.toLowerCase(),

                hidden: false,

                deletedAt: null,

                banned: false,

                violationCount: 0,
              };

              tx.set(userRef, newUser);

              tx.set(doc(db, "usernames", username), {
                uid: firebaseUser.uid,
              });

              tx.set(doc(db, "userIds", userId), {
                uid: firebaseUser.uid,
              });

              console.log("Created user:", userId, username);
            });
          }

          // EXISTING USER
          else {
            const data = snap.data() as AppUser;

            console.log("Existing user:", data.userId);

            const usernameDoc = await getDoc(
              doc(db, "usernames", data.username)
            );

            if (!usernameDoc.exists()) {
              await setDoc(
                doc(db, "usernames", data.username),
                {
                  uid: firebaseUser.uid,
                }
              );
            }

            const userIdDoc = await getDoc(
              doc(db, "userIds", data.userId)
            );

            if (!userIdDoc.exists()) {
              await setDoc(
                doc(db, "userIds", data.userId),
                {
                  uid: firebaseUser.uid,
                }
              );
            }

            await updateDoc(userRef, {
              isOnline: true,

              lastSeen: serverTimestamp(),

              emailVerified: firebaseUser.emailVerified,
            });
          }

          // VISIBILITY
          const handleVisibility = () => {
            if (!db) return;

            if (document.visibilityState === "hidden") {
              updateDoc(userRef, {
                isOnline: false,

                lastSeen: serverTimestamp(),
              }).catch(() => {});
            } else {
              updateDoc(userRef, {
                isOnline: true,
              }).catch(() => {});
            }
          };

          document.addEventListener(
            "visibilitychange",
            handleVisibility
          );

          visibilityHandlerRef.current = handleVisibility;

          // BEFORE UNLOAD
          const handleBeforeUnload = () => {
            updateDoc(userRef, {
              isOnline: false,

              lastSeen: serverTimestamp(),
            }).catch(() => {});
          };

          window.addEventListener(
            "beforeunload",
            handleBeforeUnload
          );

          beforeUnloadHandlerRef.current = handleBeforeUnload;

          // USER SNAPSHOT
          userDataUnsub.current = onSnapshot(
            userRef,

            async (docSnap) => {
              if (!docSnap.exists()) {
                setUserData(null);
                setLoading(false);
                return;
              }

              const data = docSnap.data() as AppUser;

              const isBanned =
                data.banned ||
                data.status === "banned";

              // AUTO UNBAN
              if (
                isBanned &&
                data.bannedUntil &&
                typeof data.bannedUntil.toDate === "function"
              ) {
                const banEndDate = data.bannedUntil.toDate();

                if (banEndDate < new Date()) {
                  try {
                    await updateDoc(userRef, {
                      banned: false,
                      bannedUntil: null,
                      status: "active",
                      unbannedAt: serverTimestamp(),
                      warning: false,
                      warningReason: null,
                      warningSeen: false,
                    });

                    data.banned = false;
                    data.status = "active";

                    console.log(
                      "Auto unbanned:",
                      firebaseUser.uid
                    );
                  } catch (e) {
                    console.error("Auto unban failed:", e);
                  }
                }
              }

              const stillBanned =
                data.banned ||
                data.status === "banned";

              // REDIRECT BANNED
              if (stillBanned) {
                setUserData(data);
                setLoading(false);

                const bannedKey = `banned_${data.uid}_${data.bannedAt?.seconds || 0}`;

                if (sessionStorage.getItem(bannedKey) !== "shown") {
                  sessionStorage.setItem(bannedKey, "shown");

                  setTimeout(async () => {
                    const { toast } = await import("sonner");

                    if (!data.bannedUntil) {
                      toast.error("⛔ TÀI KHOẢN ĐÃ BỊ KHÓA VĨNH VIỄN", {
                        description: `Lý do: ${data.bannedReason || "Vi phạm cộng đồng"}`,
                        duration: 10000,
                        classNames: {
                          toast: "bg-[#FFE5E5] border-2 border-[#FF3B30] dark:bg-[#FF3B30]/20 rounded-2xl",
                          title: "text-[#FF3B30] font-bold text-base",
                          description: "text-[#1C1C1E] dark:text-zinc-300",
                        }
                      });
                    } else {
                      const until = data.bannedUntil.toDate();
                      toast.error("⛔ TÀI KHOẢN ĐÃ BỊ KHÓA", {
                        description: `Lý do: ${data.bannedReason || "Vi phạm cộng đồng"}\nMở khóa lúc: ${until.toLocaleString("vi-VN")}`,
                        duration: 10000,
                        classNames: {
                          toast: "bg-[#FFE5E5] border-2 border-[#FF3B30] dark:bg-[#FF3B30]/20 rounded-2xl",
                          title: "text-[#FF3B30] font-bold text-base",
                          description: "text-[#1C1C1E] dark:text-zinc-300 whitespace-pre-line",
                        }
                      });
                    }
                  }, 300);
                }

                if (!data.bannedUntil) {
                  router.replace("/banned");
                } else {
                  const banEndDate = data.bannedUntil.toDate();
                  router.replace(`/banned?until=${banEndDate.getTime()}`);
                }

                setTimeout(async () => {
                  try {
                    await auth.signOut();
                  } catch {}
                }, 1500);

                return;
              }

              // EXIT BANNED PAGE
              if (pathname === "/banned") {
                router.replace("/");
              }

              setUserData(data);
              setLoading(false);

              console.log("userData loaded:", data.userId);
            },

            (err) => {
              console.error("Snapshot error:", err);
              setError(err.message);
              setLoading(false);
            }
          );
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

      if (userDataUnsub.current) {
        userDataUnsub.current();
      }

      if (presenceUnsub.current) {
        presenceUnsub.current();
      }

      if (visibilityHandlerRef.current) {
        document.removeEventListener(
          "visibilitychange",
          visibilityHandlerRef.current
        );
      }

      if (beforeUnloadHandlerRef.current) {
        window.removeEventListener(
          "beforeunload",
          beforeUnloadHandlerRef.current
        );
      }

      if (db && auth?.currentUser) {
        updateDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            isOnline: false,

            lastSeen: serverTimestamp(),
          }
        ).catch(() => {});
      }
    };
  }, [auth, db, rtdb, pathname, router]);

  // REALTIME WARNING TOAST
useEffect(() => {
  if (!userData || loading || !db) return;
  if (userData.banned || userData.status === "banned") return;

  // Dùng toMillis() để key unique tuyệt đối
  const warningTime = userData.warningAt?.toMillis() || 0;
  const warningKey = `${userData.uid}_${warningTime}`;

  // Reset ref khi đổi user
  if (warningToastShown.current && !warningToastShown.current.startsWith(userData.uid)) {
    warningToastShown.current = null;
  }

  if (
    userData.warning === true &&
    userData.warningSeen === false &&
    warningToastShown.current !== warningKey
  ) {
    warningToastShown.current = warningKey;
    
    // Delay 300ms cho chắc chắn Toaster đã render xong
    const timer = setTimeout(() => {
      import("sonner").then(({ toast }) => {
        console.log("FIRING TOAST FOR:", userData.username);
        toast.warning(userData.warningTitle || "⚠️ CẢNH CÁO VI PHẠM", {
          description: userData.warningMessage || `Lý do: ${userData.warningReason}. Nếu tiếp tục vi phạm tài khoản sẽ bị khóa.`,
          duration: 10000,
          id: "warning-toast",
          action: {
            label: "Đã hiểu",
            onClick: async () => {
              try {
                await updateDoc(doc(db, "users", userData.uid), {
                  warningSeen: true
                });
              } catch (e) {
                console.error("Set warningSeen failed:", e);
              }
            }
          },
          classNames: {
            toast: "bg-[#FFF3E0] border-2 border-[#FF9500] dark:bg-[#FF9500]/20 rounded-2xl",
            title: "text-[#FF9500] font-bold text-base",
            description: "text-[#1C1C1E] dark:text-zinc-300",
          }
        });
      });
    }, 300);

    return () => clearTimeout(timer);
  }
}, [userData?.warning, userData?.warningSeen, userData?.warningAt, userData?.banned, userData?.status, userData?.uid, loading, db]);

  const value = useMemo(
    () => ({
      user,
      userData,
      loading,
      error,
    }),

    [user, userData, loading, error]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
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
        await updateDoc(
          doc(db, "users", user.uid),
          {
            isOnline: false,

            lastSeen: serverTimestamp(),
          }
        );
      } catch {}
    }

    await auth.signOut();
  };
};