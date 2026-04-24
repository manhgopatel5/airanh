"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  or,
  documentId,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "@/lib/chatService";
import { FiMessageSquare, FiSearch, FiUsers } from "react-icons/fi";

type Friend = {
  uid: string;
  name?: string;
  avatar?: string;
  online?: boolean;
  lastSeen?: any;
  lastMessage?: string;
  unreadCount?: number;
};

export default function FriendList() {
  const { user } = useAuth();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [chattingId, setChattingId] = useState<string | null>(null);
  const presenceUnsubs = useRef<Record<string, () => void>>({});

  /* ================= LOAD FRIENDS + PRESENCE ================= */
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "friends"),
      or(where("userId", "==", user.uid), where("friendId", "==", user.uid))
    );

    const unsub = onSnapshot(q, async (snap) => {
      try {
        // 1. Lấy friendIds unique
        const friendIds = new Set<string>();
        snap.docs.forEach((d) => {
          const data = d.data();
          friendIds.add(data.userId === user.uid ? data.friendId : data.userId);
        });

        if (friendIds.size === 0) {
          setFriends([]);
          setLoading(false);
          return;
        }

        // 2. Batch get users - dùng documentId in
        const ids = Array.from(friendIds);
        const batches: string[][] = [];
        for (let i = 0; i < ids.length; i += 10) {
          batches.push(ids.slice(i, i + 10));
        }

        const userDocs = await Promise.all(
          batches.map((batch) =>
            getDocs(query(collection(db, "users"), where(documentId(), "in", batch)))
          )
        );

        // 3. Cleanup presence listener cũ
        Object.values(presenceUnsubs.current).forEach((unsub) => unsub());
        presenceUnsubs.current = {};

        const list: Friend[] = [];
        userDocs.forEach((snap) => {
          snap.forEach((u) => {
            const data = u.data();
            list.push({ uid: u.id, ...data } as Friend);

            // Listen online status realtime
            presenceUnsubs.current[u.id] = onSnapshot(doc(db, "users", u.id), (userSnap) => {
              const userData = userSnap.data();
              setFriends((prev) =>
                prev.map((f) =>
                  f.uid === u.id
                    ? { ...f, online: userData?.online, lastSeen: userData?.lastSeen }
                    : f
                )
              );
            });
          });
        });

        // Sort online trước, rồi theo tên
        list.sort((a, b) => {
          if (a.online && !b.online) return -1;
          if (!a.online && b.online) return 1;
          return (a.name || "").localeCompare(b.name || "", "vi");
        });

        setFriends(list);
      } catch (err) {
        console.error("Lỗi load friends:", err);
      }
      setLoading(false);
    });

    return () => {
      unsub();
      Object.values(presenceUnsubs.current).forEach((unsub) => unsub());
    };
  }, [user?.uid]);

  /* ================= FILTER SEARCH ================= */
  const filtered = useMemo(() => {
    if (!search.trim()) return friends;
    const key = search.toLowerCase();
    return friends.filter((f) => f.name?.toLowerCase().includes(key));
  }, [friends, search]);

  /* ================= CHAT ================= */
  const handleChat = useCallback(async (fid: string) => {
    if (!user?.uid || chattingId) return;
    setChattingId(fid);

    try {
      const id = await getOrCreateConversation(user.uid, fid);
      router.push(`/chat/${id}`);
    } catch (err) {
      console.error("Lỗi chat:", err);
    } finally {
      setChattingId(null);
    }
  }, [user?.uid, chattingId, router]);

  /* ================= PREFETCH ================= */
  const handleMouseEnter = useCallback(async (fid: string) => {
    if (!user?.uid) return;
    const id = await getOrCreateConversation(user.uid, fid);
    router.prefetch(`/chat/${id}`);
  }, [user?.uid, router]);

  /* ================= LOADING SKELETON ================= */
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-3 animate-pulse border border-gray-100 dark:border-zinc-800"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
                <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
              </div>
              <div className="w-20 h-8 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ================= EMPTY ================= */
  if (!friends.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-zinc-500">
        <FiUsers size={48} className="mb-3" />
        <p className="font-semibold">Chưa có bạn bè</p>
        <p className="text-sm mt-1">Kết bạn để bắt đầu trò chuyện</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* HEADER + SEARCH */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bạn bè</h2>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-lg">
            {friends.length}
          </span>
        </div>

        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm bạn bè..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
          />
        </div>
      </div>

      {/* LIST */}
      <div className="space-y-2">
        {filtered.map((f) => (
          <div
            key={f.uid}
            onMouseEnter={() => handleMouseEnter(f.uid)}
            className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm shadow-gray-100/50 dark:shadow-black/20 p-3 flex items-center justify-between gap-3 group hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/40 transition-all duration-200"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative">
                <img
                  src={f.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || "U")}&background=random`}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-50 dark:ring-zinc-800"
                  alt="avatar"
                />
                {f.online && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-zinc-900" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {f.name || "User"}
                </div>
                <div className="text-xs text-gray-500 dark:text-zinc-400">
                  {f.online ? "Đang hoạt động" : "Offline"}
                </div>
                {f.lastMessage && (
                  <div className="text-xs text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                    {f.lastMessage}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => handleChat(f.uid)}
              disabled={!user || chattingId === f.uid}
              className="shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 relative"
            >
              {chattingId === f.uid ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FiMessageSquare size={16} />
              )}
              Nhắn tin
              {f.unreadCount ? (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {f.unreadCount > 9 ? "9+" : f.unreadCount}
                </span>
              ) : null}
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && search && (
        <div className="text-center py-10 text-gray-400 dark:text-zinc-500">
          <p className="font-medium">Không tìm thấy "{search}"</p>
        </div>
      )}
    </div>
  );
}
