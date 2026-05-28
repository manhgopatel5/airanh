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
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import {
  ref,
  onValue,
  set,
  onDisconnect,
  serverTimestamp as rtdbTimestamp,
} from "firebase/database";
import { setCookie, deleteCookie } from 'cookies-next';

export type AppUser = {
  uid: string;
  displayName: string;
  username: string;
  email: string | null;
  emailVerified: boolean;
  photoURL: string | null;
  isOnline: boolean;
  lastSeen: Timestamp | string; // Cho phép string từ cache
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

// ========== 1. CACHE LAYER ==========
const USER_CACHE_KEY = 'user_profile_v1';
const CACHE_VERSION = 1; // Tăng version khi đổi schema AppUser

type CachedUser = AppUser & { _v: number; _cachedAt: number };

const getCachedUser = (): AppUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as CachedUser;
    // Bỏ cache cũ nếu đổi version hoặc quá 7 ngày
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
  // 2. ĐỌC CACHE TRƯỚC -> RENDER NGAY, 0ms CHỜ
  const [userData, setUserData] = useState<AppUser | null>(() => getCachedUser());
  // 3. CHỈ LOADING NẾU CHƯA CÓ CACHE
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

  const refreshToken = useCallback(async () => {
    if (!auth?.currentUser) return;
    const token = await auth.currentUser.getIdToken(true);
    setCookie('__session', token, {
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
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
        deleteCookie('__session');
        setLoading(false);
        return;
      }

      // 4. NẾU CÓ CACHE ĐÚNG UID -> TẮT LOADING NGAY, KHÔNG CHỜ FIRESTORE
      const cached = getCachedUser();
      if (cached?.uid === firebaseUser.uid) {
        setUserData(cached);
        setLoading(false);
      }

      try {
        // 5. BỎ `true`. Dùng token cũ nếu còn hạn, nhanh gấp 10 lần
        const token = await firebaseUser.getIdToken();
        setCookie('__session', token, {
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        });

        // 6. LISTEN FIRESTORE NGẦM ĐỂ UPDATE CACHE
        const userRef = doc(db, "users", firebaseUser.uid);
        userDataUnsub.current = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as AppUser;
              setUserData(data);
              setCachedUser(data); // Update cache
            } else {
              createUserProfile(firebaseUser);
            }
            setLoading(false); // Tắt loading lần cuối cho chắc
          },
          (err) => {
            console.error("Snapshot error:", err);
            setError(err.message);
            setLoading(false);
          }
        );

        // 7. PRESENCE RTDB - Chạy ngầm, không chặn render
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
  }, [auth, db, rtdb, createUserProfile]);

  const logout = useCallback(async () => {
    if (!auth) return;
    const currentUser = auth.currentUser;

    // Xóa cache trước
    setCachedUser(null);
    deleteCookie('__session');

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