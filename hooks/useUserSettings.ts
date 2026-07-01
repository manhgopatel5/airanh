"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import {
  DEFAULT_GENERAL_SETTINGS,
  type GeneralSettings,
  type UserSettings,
} from "@/types/settings";
import { normalizeBlockedUsers } from "@/lib/blockedUsers";

export function useUserSettings() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const [settings, setSettings] = useState<UserSettings>({
    ...DEFAULT_GENERAL_SETTINGS,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const raw = snap.exists() ? snap.data().settings || {} : {};
        const blockedUsers = normalizeBlockedUsers(raw.blockedUsers);
        setSettings({
          ...DEFAULT_GENERAL_SETTINGS,
          ...raw,
          blockedUsers,
        });
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [user?.uid, db]);

  const updateSetting = useCallback(
    async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      if (!user?.uid) return false;
      setSettings((prev) => ({ ...prev, [key]: value }));
      try {
        await updateDoc(doc(db, "users", user.uid), {
          [`settings.${String(key)}`]: value,
        });
        return true;
      } catch {
        setSettings((prev) => prev);
        return false;
      }
    },
    [user?.uid, db]
  );

  const general = settings as GeneralSettings;

  return { settings, general, loading, updateSetting };
}
