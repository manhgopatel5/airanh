"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut,
  getIdTokenResult,
  IdTokenResult,
} from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB, getFirebaseRTDB } from "@/lib/firebase";
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
import { ref, onDisconnect, set, serverTimestamp as rtdbServerTimestamp, DatabaseReference } from "firebase/database";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";

/* ================= TYPES ================= */
export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  emailVerified: boolean;
  avatar: string;
  shortId: string;
  username?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: Timestamp;
  role: "user" | "admin" | "moderator";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  postsCount?: number;
  tasksJoined?: number;
  friendRequestsUnread?: number;
};

export type UseAuthReturn = {
  user: User | null;
  profile: UserProfile | null;
  claims: IdTokenResult["claims"] | null;
  loading: boolean;
  loadingProfile: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshClaims: () => Promise<void>;
};

/* ================= SINGLETON STORE ================= */
let globalStore: UseAuthReturn | null = null;
const listeners = new Set<(state: UseAuthReturn) => void>();

let initialized = false;
let unsubAuth: Unsubscribe | null = null;
let unsubProfile: Unsubscribe | null = null;
let presenceRef: DatabaseReference | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

function initAuthStore() {
  if (initialized) return;
  initialized = true;

  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const rtdb = getFirebaseRTDB();

  let user: User | null = null;
  let profile: UserProfile | null = null;
  let claims: IdTokenResult["claims"] | null = null;
  let loading = true;
  let loadingProfile = false;
  let error: string | null = null;

  const updateStore = () => {
    const state: UseAuthReturn = {
      user,
      profile,
      claims,
      loading,
      loadingProfile,
      error,
      isAuthenticated: !!user && !loading,
      isAdmin: profile?.role === "admin" || claims?.admin === true,
      signOut: async () => {
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
            profile = { uid: snap.id, ...snap.data() } as UserProfile;
            updateStore();
          }
        } catch (e) {
          error = "Không thể tải profile";
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

  const setupPresence = (uid: string) => {
    if (!rtdb) return;
    const userStatusRef = ref(rtdb, `/status/${uid}`);
    presenceRef = userStatusRef;
    
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

    heartbeatInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        updateDoc(doc(db, "users", uid), {
          lastSeen: serverTimestamp(),
        }).catch(() => {});
      }
    }, 120000);
  };

  const cleanupPresence = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    if (presenceRef) {
      set(presenceRef, { isOnline: false, lastSeen: rtdbServerTimestamp() }).catch(() => {});
      presenceRef = null;
    }
  };

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
      cleanupPresence();

      if (u) {
        loadingProfile = true;
        updateStore();

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
            emailVerified: u.emailVerified,
            avatar: u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.email || "U")}`,
            shortId: nanoid(8).toUpperCase(),
            bio: "",
            isOnline: true,
            lastSeen: Timestamp.now(),
            role: "user",
            createdAt: serverTimestamp() as Timestamp,
            postsCount: 0,
            tasksJoined: 0,
            friendRequestsUnread: 0,
          };
          await setDoc(userRef, newProfile);
        }

        unsubProfile = onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) {
              profile = { uid: snap.id, ...snap.data() } as UserProfile;
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

        setupPresence(u.uid);
      } else {
        profile = null;
        claims = null;
        loading = false;
        loadingProfile = false;
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
      loadingProfile: false,
      error: null,
      isAuthenticated: false,
      isAdmin: false,
      signOut: async () => {},
      refreshProfile: async () => {},
      refreshClaims: async () => {},
    }
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
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

  return useMemo(
    () => state,
    [
      state.user,
      state.profile,
      state.claims,
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
  return useMemo(() => !!user && !!ownerId && user.uid === ownerId, [user, ownerId]);
}

export function useRequireAuth(redirectTo = "/login") {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(redirectTo);
    }
  }, [user, loading, redirectTo, router]);

  return { user, loading, isAuthenticated: !!user && !loading };
}

export function useRequireAdmin(redirectTo = "/") {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace(redirectTo);
    }
  }, [isAdmin, loading, redirectTo, router]);

  return { isAdmin, loading };
}