"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

export function useActiveStrangerChatId() {
  const { user } = useAuth();
  const [chatId, setChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setChatId(null);
      return;
    }

    const q = query(
      collection(getFirebaseDB(), "stranger_chats"),
      where("members", "array-contains", user.uid),
      where("status", "==", "active"),
      limit(1)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setChatId(snap.docs[0]?.id ?? null);
      },
      () => setChatId(null)
    );

    return () => unsub();
  }, [user?.uid]);

  return chatId;
}
