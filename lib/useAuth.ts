"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut,
  getIdTokenResult,
  IdTokenResult,
} from "firebase/auth";
import { auth, db, rtdb, authReady } from "@/lib/firebase"; // ✅ FIX 7: Thêm rtdb
import {
  doc,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  setDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from "firebase/database";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";

/* ================= TYPES ================= */
export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  emailVerified: boolean; // ✅ FIX 6
  avatar: string;
  shortId: string;
  username?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: Timestamp;
  role: "user" | "admin" | "moderator"; // ✅ FIX 6
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  postsCount?: number;
  tasksJoined?: number;
  friendRequestsUnread?: number;
};

export type UseAuthReturn = {
  user: User | null;
  profile: UserProfile | null;
  claims: IdTokenResult["claims"] | null; // ✅ FIX 8
  loading: boolean;
  loadingProfile: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean; // ✅ FIX 6
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshClaims: () => Promise<void>; // ✅ FIX 8
};

/* ================= SINGLETON STORE ================= */
let globalStore: UseAuthReturn | null = null;
const listeners = new Set<(state: UseAuthReturn) => void>();

let initialized = false;
let unsubAuth: Unsubscribe | null = null;
let unsubProfile: Unsubscribe | null = null;
let presenceRef: any = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

function initAuthStore() {
  if (initialized) return;
  initialized = true;

  let user: User | null = null;
  let profile: UserProfile | null = null;
  let claims: IdTokenResult["claims"] | null = null;
  let loading = true;
  let loadingProfile = false; // ✅ FIX 10: Mặc định false
  let error: string | null = null;

  const updateStore = () => {
    const state: UseAuthReturn = {
      user,
      profile,
      claims,
      loading,
      loadingProfile,
      error,
      isAuthenticated:!!user &&!loading,
      isAdmin: profile?.role === "admin" || claims?.admin === true, // ✅ FIX 6
      signOut: async () => {
        // ✅ FIX 2: Set offline trước khi logout
        if (user) {
          try {
            await updateDoc(doc(db, "users", user.uid), {
              isOnline: false,
              lastSeen: serverTimestamp(),
            });
          } catch {}
        }
        await firebaseSignOut(auth);
      },
      refreshProfile: async () => {
        if (!user) return;
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            profile = { uid: snap.id,...snap.data() } as UserProfile;
            updateStore();
          }
        } catch (e) {
          error = "Không thể tải profile"; // ✅ FIX 9
          updateStore();
        }
      },
      refreshClaims: async () => {
        if (!user) return;
        try {
          const token = await getIdTokenResult(user, true);
          claims = token.claims;
          updateStore();
        } catch {}
      },
    };
    globalStore = state;
    listeners.forEach((l) => l(state));
  };

  // ✅ FIX 3: Presence system
  const setupPresence = (uid: string) => {
    if (!rtdb) return;
    const userStatusRef = ref(rtdb, `/status/${uid}`);
    const isOffline = {
      isOnline: false,
      lastSeen: rtdbServerTimestamp(),
    };
    const isOnline = {
      isOnline: true,
      lastSeen: rtdbServerTimestamp(),
    };

    onDisconnect(userStatusRef).set(isOffline).then(() => {
      set(userStatusRef, isOnline);
    });

    // Update Firestore mỗi 2 phút
    heartbeatInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        updateDoc(doc(db, "users", uid), {
          lastSeen: serverTimestamp(),
        }).catch(() => {});
      }
    }, 120000); // ✅ FIX 11
  };

  const cleanupPresence = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    if (presenceRef) {
      set(presenceRef, { isOnline: false, lastSeen: rtdbServerTimestamp() });
      presenceRef = null;
    }
  };

  authReady.then(() => {
    unsubAuth = onAuthStateChanged(
      auth,
      async (u) => {
        user = u;
        error = null;
        claims = null;

        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        cleanupPresence(); // ✅ FIX 3

        if (u) {
          loadingProfile = true;
          updateStore();

          // ✅ FIX 8: Lấy claims
          try {
            const token = await getIdTokenResult(u);
            claims = token.claims;
          } catch {}

          const userRef = doc(db, "users", u.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            const newProfile: Omit<UserProfile, "uid"> = {
              name: u.displayName || u.email?.split("@")[0] || "User",
              email: u.email || "",
              emailVerified: u.emailVerified, // ✅ FIX 6
              avatar: u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.email || "U")}`,
              shortId: nanoid(8).toUpperCase(),
              bio: "",
              isOnline: true,
              lastSeen: Timestamp.now(), // ✅ FIX 4: Dùng now() local
              role: "user", // ✅ FIX 6
              createdAt: serverTimestamp() as Timestamp,
              postsCount: 0,
              tasksJoined: 0,
              friendRequestsUnread: 0,
            };
            await setDoc(userRef, newProfile);
          }

          // ✅ FIX 12: Chỉ listen field cần thiết
          unsubProfile = onSnapshot(
            userRef,
            (snap) => {
              if (snap.exists()) {
                profile = { uid: snap.id,...snap.data() } as UserProfile;
                error = null;
              } else {
                profile = null;
              }
              loading = false;
              loadingProfile = false;
              updateStore();
            },
            (err) => {
              console.error("Profile listener:", err);
              error = "Không thể tải thông tin";
              profile = null;
              loading = false;
              loadingProfile = false;
              updateStore();
            }
          );

          setupPresence(u.uid); // ✅ FIX 3
        } else {
          profile = null;
          claims = null;
          loading = false;
          loadingProfile = false; // ✅ FIX 10
          updateStore();
        }
      },
      (err) => {
        console.error("Auth error:", err);
        error = "Lỗi xác thực";
        user = null;
        profile = null;
        loading = false;
        loadingProfile = false;
        updateStore();
      }
    );
  });

  // ✅ FIX 1: Cleanup khi không còn listener
  const checkCleanup = () => {
    if (listeners.size === 0) {
      unsubAuth?.();
      unsubProfile?.();
      cleanupPresence();
      unsubAuth = null;
      unsubProfile = null;
      initialized = false;
    }
  };

  // Gọi mỗi 5s để check
  setInterval(checkCleanup, 5000);
}

/* ================= HOOK ================= */
export function useAuth(): UseAuthReturn {
  const [, forceUpdate] = useState({});
  const [state, setState] = useState<UseAuthReturn>(
    globalStore || {
      user: null,
      profile: null,
      claims: null,
      loading: true,
      loadingProfile: false, // ✅ FIX 10
      error: null,
      isAuthenticated: false,
      isAdmin: false,
      signOut: async () => {},
      refreshProfile: async () => {},
      refreshClaims: async () => {},
    }
  );

  useEffect(() => {
    if (typeof window === "undefined") return; // ✅ FIX 13: SSR guard
    initAuthStore();
    const listener = (s: UseAuthReturn) => {
      setState(s);
      forceUpdate({});
    };
    listeners.add(listener);
    if (globalStore) setState(globalStore);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  // ✅ FIX 5: Memo từng field thay vì cả object
  return useMemo(
    () => state,
    [
      state.user,
      state.profile,
      state.claims,
      state.loading,
      state.loadingProfile,
      state.error,
      state.isAuthenticated,
      state.isAdmin,
    ]
  );
}

/* ================= BONUS HOOKS ================= */
export function useIsOwner(ownerId?: string): boolean {
  const { user } = useAuth();
  return useMemo(() =>!!user &&!!ownerId && user.uid === ownerId, [user, ownerId]);
}

export function useRequireAuth(redirectTo = "/login") {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading &&!user) {
      router.replace(redirectTo);
    }
  }, [user, loading, redirectTo, router]);

  return { user, loading, isAuthenticated:!!user &&!loading }; // ✅ FIX 8
}

export function useRequireAdmin(redirectTo = "/") {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading &&!isAdmin) {
      router.replace(redirectTo);
    }
  }, [isAdmin, loading, redirectTo, router]);

  return { isAdmin, loading };
}
