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
import { useRouter } from "next/navigation";

export type AppUser = {
  uid: string;
  displayName: string; // Bắt buộc
  username: string; // Bắt buộc
  email: string | null;
  emailVerified: boolean;
  photoURL: string | null;
  isOnline: boolean;
  lastSeen: Timestamp;
  fcmTokens?: string[];
  verified: boolean;
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
  const router = useRouter();

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
      const res = await fetch('/api/user/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to create user profile');
    } catch (e) {
      console.error("Create user error:", e);
      setError("Không tạo được hồ sơ");
    }
  }, []);

  useEffect(() => {
    if (!auth ||!db ||!rtdb) return;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setError(null);

      userDataUnsub.current?.();
      presenceUnsub.current?.();

      if (!firebaseUser) {
        setUserData(null);
        deleteCookie('__session');
        setLoading(false);
        return;
      }

      try {
        const token = await firebaseUser.getIdToken();
        setCookie('__session', token, {
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
          sameSite: 'lax'
        });

        const userRef = doc(db, "users", firebaseUser.uid);
        userDataUnsub.current = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as AppUser;

              // CHUẨN: Force user hoàn tất profile
    

              setUserData(data);
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

        // Presence RTDB
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
  }, [auth, db, rtdb, createUserProfile, router]);

  const logout = useCallback(async () => {
    if (!auth) return;
    const currentUser = auth.currentUser;

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
  }, [auth]);

  const value = useMemo(
    () => ({ user, userData, loading, error, logout }),
    [user, userData, loading, error, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);