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
import {
  doc,
  onSnapshot,
  Timestamp,
  
  

} from "firebase/firestore";
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
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  error: null,
  logout: async () => {},
});

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

  // 1. Dynamic import Firebase để giảm bundle ban đầu
  useEffect(() => {
    const init = async () => {
      const firebase = await import("@/lib/firebase");
      setAuth(firebase.getFirebaseAuth());
      setDb(firebase.getFirebaseDB());
      setRtdb(firebase.getFirebaseRTDB());
    };
    init();
  }, []);

  // 2. Hàm tạo user mới -> gọi API route, không chạy runTransaction ở client
  const createUserProfile = useCallback(async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/user/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to create user profile');
    } catch (e) {
      console.error("Create user error:", e);
    }
  }, []);

  useEffect(() => {
    if (!auth || !db || !rtdb) return;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // 3. XOÁ TOÀN BỘ LOGIC NẶNG. Chỉ set state + cookie
      setUser(firebaseUser);
      setError(null);

      // Cleanup listeners cũ
      userDataUnsub.current?.();
      presenceUnsub.current?.();

      if (!firebaseUser) {
        setUserData(null);
        deleteCookie('__session');
        setLoading(false);
        return;
      }

      try {
        // 4. Set cookie cho middleware đọc, không chặn UI
        const token = await firebaseUser.getIdToken();
        setCookie('__session', token, { 
          maxAge: 60 * 60 * 24 * 7, // 7 ngày
          path: '/',
          sameSite: 'lax'
        });

        // 5. Chỉ onSnapshot user data. Không await gì hết
        const userRef = doc(db, "users", firebaseUser.uid);
        userDataUnsub.current = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data() as AppUser);
            } else {
              // Nếu chưa có profile thì gọi API tạo
              createUserProfile(firebaseUser);
            }
            setLoading(false); // Bỏ loading ngay khi có user
          },
          (err) => {
            console.error("Snapshot error:", err);
            setError(err.message);
            setLoading(false);
          }
        );

        // 6. XOÁ trackCurrentSession. Tốn 3-5 reads mỗi lần F5. Dùng middleware + API
        
        // 7. Presence chỉ dùng RTDB, không update Firestore mỗi lần online
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

  // 8. Hàm logout tập trung
  const logout = useCallback(async () => {
    if (!auth || !db) return;
    const currentUser = auth.currentUser;
    
    // Xóa session ở server
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        await fetch('/api/user/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {}
    }

    deleteCookie('__session');
    await signOut(auth);
  }, [auth, db]);

  const value = useMemo(
    () => ({ user, userData, loading, error, logout }),
    [user, userData, loading, error, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);