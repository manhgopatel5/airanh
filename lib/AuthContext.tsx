"use client";

import {
  createContext,
  useEffect,
  useState,
  useRef,
  useMemo,
  ReactNode,
  useContext,
  useCallback,
} from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, onSnapshot, Timestamp, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  ref,
  onValue,
  set,
  onDisconnect,
  serverTimestamp as rtdbTimestamp,
} from "firebase/database";
import { establishSession, clearServerSession } from "@/lib/authSession";

export type AppUser = {
  uid: string;
  displayName: string;
  username: string;
  email: string | null;
  emailVerified: boolean;
  photoURL: string | null;
  isOnline: boolean;
  lastSeen: Timestamp | string;
  fcmTokens?: string[];
  verified: boolean;
  status: "active" | "banned" | "deleted" | "deactivated";
  searchKeywords: string[];
  nameLower: string;
  bio?: string;
  hidden?: boolean;
  deletedAt?: any;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
  onboardingCompleted: boolean;
  huhaScore?: number; // THÊM DÒNG NÀY
};

type AuthContextType = {
  user: User | null;
  userData: AppUser | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  error: null,
  logout: async () => {},
  refreshToken: async () => {},
});

const USER_CACHE_KEY = 'user_profile_v1';
const CACHE_VERSION = 1;

type CachedUser = AppUser & { _v: number; _cachedAt: number };

const getCachedUser = (): AppUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as CachedUser;
    if (parsed._v!== CACHE_VERSION || Date.now() - parsed._cachedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(USER_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const setCachedUser = (user: AppUser | null) => {
  if (typeof window === 'undefined') return;
  if (user) {
    const toCache: CachedUser = {...user, _v: CACHE_VERSION, _cachedAt: Date.now() };
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(toCache));
  } else {
    localStorage.removeItem(USER_CACHE_KEY);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<any>(null);
  const [db, setDb] = useState<any>(null);
  const [rtdb, setRtdb] = useState<any>(null);

  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(() => getCachedUser());
  const [loading, setLoading] = useState(() =>!getCachedUser());
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

  const createUserProfile = useCallback(async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      await fetch('/api/user/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Create user error:", e);
      setError("Không tạo được hồ sơ");
    }
  }, []);

  // HÀM MỚI: Thêm field huhaScore và nameLower nếu thiếu
  const updateUserLogin = useCallback(async (firebaseUser: User) => {
    if (!db) return;
    const userRef = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
      const data = snap.data();
      const updates: any = {};
      if (data.huhaScore === undefined) updates.huhaScore = 0;
      if (data.nameLower === undefined) updates.nameLower = data.displayName?.toLowerCase() || "";
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
      }
    } else {
      // Nếu chưa có doc thì tạo mới luôn
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || "User",
        nameLower: firebaseUser.displayName?.toLowerCase() || "",
        photoURL: firebaseUser.photoURL || "",
        email: firebaseUser.email,
        huhaScore: 0,
        createdAt: serverTimestamp()
      });
    }
  }, [db]);

  const refreshToken = useCallback(async () => {
    if (!auth?.currentUser) return;
    const token = await auth.currentUser.getIdToken(true);
    await establishSession(token);
  }, [auth]);

  useEffect(() => {
    if (!auth ||!db ||!rtdb) return;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setError(null);

      userDataUnsub.current?.();
      presenceUnsub.current?.();

      if (!firebaseUser) {
        setUserData(null);
        setCachedUser(null);
        await clearServerSession();
        setLoading(false);
        return;
      }

      // Có cache đúng uid → hiển thị nhanh, nhưng vẫn chờ session cookie
      const cached = getCachedUser();
      if (cached?.uid === firebaseUser.uid) {
        setUserData(cached);
      }

      try {
        // GỌI HÀM UPDATE Ở ĐÂY
        await updateUserLogin(firebaseUser);

        // Tạo session cookie httpOnly cho middleware
        const token = await firebaseUser.getIdToken();
        await establishSession(token);

        const userRef = doc(db, "users", firebaseUser.uid);
        userDataUnsub.current = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as AppUser;
              setUserData(data);
              setCachedUser(data);
            } else {
              createUserProfile(firebaseUser);
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
    });

    return () => {
      unsubAuth();
      userDataUnsub.current?.();
      presenceUnsub.current?.();
    };
  }, [auth, db, rtdb, createUserProfile, updateUserLogin]);

  const logout = useCallback(async () => {
    if (!auth) return;
    const currentUser = auth.currentUser;

    setCachedUser(null);
    await clearServerSession();

    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        await fetch('/api/user/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {}
    }
    await signOut(auth);
  }, [auth]);

  const value = useMemo(
    () => ({ user, userData, loading, error, logout, refreshToken }),
    [user, userData, loading, error, logout, refreshToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);