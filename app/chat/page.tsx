"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { FiSearch, FiMessageSquare, FiUserPlus, FiX } from "react-icons/fi";
import { IoSparkles } from "react-icons/io5";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

type FriendItem = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
  shortId: string;
  lastMessage?: string;
  lastSeen?: any;
  isOnline?: boolean;
  unreadCount?: number;
};

export default function ChatPage() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadFriends = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "users"),
          where("uid", "!=", user.uid),
          orderBy("lastSeen", "desc"),
          limit(30)
        );
        const snap = await getDocs(q);
        const list: FriendItem[] = snap.docs.map((d) => ({
         ...(d.data() as FriendItem),
          unreadCount: Math.floor(Math.random() * 3), // Mock, sau thay bằng data thật
        }));
        setFriends(list);
      } catch (e) {
        console.error(e);
        toast.error("Lỗi tải danh sách");
      } finally {
        setLoading(false);
      }
    };
    loadFriends();
  }, );

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!search.trim()) return;
    const keyword = search.trim().toUpperCase();
    setSearching(true);
    try {
      const shortIdRef = doc(db, "shortIds", keyword);
      const shortIdSnap = await getDoc(shortIdRef);
      if (shortIdSnap.exists()) {
        router.push(`/chat/${shortIdSnap.data().uid}`);
        return;
      }

      const usernameRef = doc(db, "usernames", keyword.toLowerCase());
      const usernameSnap = await getDoc(usernameRef);
      if (usernameSnap.exists()) {
        router.push(`/chat/${usernameSnap.data().uid}`);
        return;
      }

      toast.error("Không tìm thấy người dùng");
    } catch (e) {
      toast.error("Lỗi tìm kiếm");
    } finally {
      setSearching(false);
    }
  };

  const filtered = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.username.toLowerCase().includes(search.toLowerCase()) ||
      f.shortId.includes(search.toUpperCase())
  );

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
        {/* HEADER GLASS */}
        <div className="sticky top-0 z-20 backdrop-blur-2xl bg-white/70 dark:bg-zinc-950/70 border-b border-gray-200/50 dark:border-zinc-800/50">
          <div className="px-5 pt-7 pb-4">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-[32px] font-black tracking-tight text-gray-900 dark:text-white">
                Tin nhắn
              </h1>
              <button className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-90 transition-transform">
                <FiUserPlus className="text-white" size={20} />
              </button>
            </div>

            {/* SEARCH BAR */}
            <form onSubmit={handleSearch} className="relative group">
              <div
                className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur-xl transition-opacity ${
                  focused? "opacity-100" : "opacity-0"
                }`}
              />
              <div className="relative flex items-center h-12 bg-gray-100/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border-2 border-transparent focus-within:border-blue-500/50 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all">
                <FiSearch
                  className={`ml-4 transition-colors ${
                    focused? "text-blue-500" : "text-gray-400 dark:text-zinc-500"
                  }`}
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Tìm bạn bè, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="w-full h-full px-3 bg-transparent text-[15px] font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mr-3 w-6 h-6 rounded-full bg-gray-300 dark:bg-zinc-700 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <FiX className="text-gray-600 dark:text-zinc-300" size={14} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* LIST */}
        <div className="px-3 py-2">
          {loading? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                  <div className="w-[56px] h-[56px] bg-gray-200 dark:bg-zinc-800 rounded-full" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded-lg w-1/3" />
                    <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded-lg w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full blur-2xl" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-900 dark:to-zinc-800 rounded-full flex items-center justify-center">
                  {search? (
                    <FiSearch className="text-gray-400 dark:text-zinc-600" size={32} />
                  ) : (
                    <FiMessageSquare className="text-gray-400 dark:text-zinc-600" size={32} />
                  )}
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {search? "Không tìm thấy" : "Chưa có tin nhắn"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium max-w-[240px]">
                {search
               ? `Không có kết quả cho "${search}"`
                  : "Tìm bạn bè bằng ID hoặc username để bắt đầu trò chuyện"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((f) => (
                <Link
                  key={f.uid}
                  href={`/chat/${f.uid}`}
                  className="group flex items-center gap-4 p-3 rounded-3xl hover:bg-white dark:hover:bg-zinc-900/60 active:scale-[0.98] transition-all duration-200"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-[56px] h-[56px] rounded-full ring-2 ring-white dark:ring-zinc-950 shadow-lg shadow-gray-900/5 overflow-hidden">
                      <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                    </div>
                    {f.isOnline && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full ring-[3px] ring-white dark:ring-zinc-950">
                        <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-bold text-[15px] text-gray-900 dark:text-white truncate">
                          {f.name}
                        </p>
                        {f.unreadCount? (
                          <IoSparkles className="text-blue-500 flex-shrink-0" size={14} />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {f.lastSeen && (
                          <p className="text-[13px] text-gray-400 dark:text-zinc-500 font-medium">
                            {formatDistanceToNow(f.lastSeen.toDate(), {
                              addSuffix: true,
                              locale: vi,
                            }).replace("khoảng ", "")}
                          </p>
                        )}
                        {f.unreadCount? (
                          <div className="min-w-[20px] h-5 px-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-[11px] font-bold text-white">{f.unreadCount}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-[14px] text-gray-500 dark:text-zinc-400 font-medium truncate">
                      {f.lastMessage || `@${f.username} · ${f.shortId}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}