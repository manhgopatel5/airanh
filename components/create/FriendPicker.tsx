"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { cn } from "@/lib/utils";
import { FiCheck } from "react-icons/fi";

type Friend = { uid: string; name: string; avatar: string };

type Props = {
  userId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  accent?: string;
};

export default function FriendPicker({ userId, selectedIds, onChange, accent = "#0A84FF" }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const db = getFirebaseDB();
        const snap = await getDocs(collection(db, "users", userId, "friends"));
        if (cancelled) return;
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            name: (data.name as string) || "Bạn bè",
            avatar: (data.avatar as string) || "",
          };
        });
        setFriends(list);
      } catch {
        if (!cancelled) setFriends([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggle = (uid: string) => {
    if (selectedIds.includes(uid)) {
      onChange(selectedIds.filter((id) => id !== uid));
    } else {
      onChange([...selectedIds, uid]);
    }
  };

  if (loading) {
    return <p className="text-sm text-zinc-500">Đang tải danh sách bạn bè...</p>;
  }

  if (friends.length === 0) {
    return <p className="text-sm text-zinc-500">Chưa có bạn bè để chọn.</p>;
  }

  return (
    <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-zinc-200 p-2 dark:border-zinc-800">
      {friends.map((f) => {
        const active = selectedIds.includes(f.uid);
        return (
          <button
            key={f.uid}
            type="button"
            onClick={() => toggle(f.uid)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
              active ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
            )}
          >
            <UserAvatar src={f.avatar} name={f.name} size={36} className="rounded-full" />
            <span className="flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-white">{f.name}</span>
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border-2",
                active ? "border-transparent text-white" : "border-zinc-300 dark:border-zinc-600"
              )}
              style={active ? { background: accent } : undefined}
            >
              {active && <FiCheck className="h-3.5 w-3.5" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
