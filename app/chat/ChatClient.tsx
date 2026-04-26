"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  getDocs,
  limit,
} from "firebase/firestore";
import { FiSearch, FiMessageSquare, FiUserPlus, FiX, FiLoader } from "react-icons/fi";
import { IoSparkles, IoCheckmarkDone } from "react-icons/io5";
import { RiAddLine } from "react-icons/ri";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

type FriendItem = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
  userId: string;
  lastMessage?: string;
  lastSeen?: any;
  isOnline?: boolean;
  unreadCount?: number;
};

export default function ChatClient() {
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "friends"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        try {
          setLoading(true);
          const friendIds = snap.docs
          .map((d) => d.data().friendId)
          .filter((id): id is string => typeof id === "string" &&!!id);

          if (!friendIds.length) {
            setFriends([]);
            setLoading(false);
            return;
          }

          const chunks: string[][] = [];
          for (let i = 0; i < friendIds.length; i += 10) {
            chunks.push(friendIds.slice(i, i + 10));
          }

          const userSnaps = await Promise.all(
            chunks.map((chunk) =>
              Promise.all(chunk.map((id) => getDoc(doc(db, "users", id))))
            )
          );

          const list: FriendItem[] = userSnaps
          .flat()
          .filter((s): s is NonNullable<typeof s> => s!== null && s.exists())
          .map((s) => {
              const data = s.data();
              return {
                uid: s.id,
                name: data?.name || "User",
                username: data?.username || "",
                avatar:
                  data?.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    data?.name || "User"
                  )}&background=random`,
                userId: data?.userId || "",
                lastSeen: data?.lastSeen,
                isOnline: data?.isOnline || false,
                unreadCount: 0,
              };
            });

          setFriends(list);
        } catch (e) {
          console.error(e);
          toast.error("Lỗi tải danh sách");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error(error);
        toast.error("Lỗi tải danh sách");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, authLoading, db]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const auth = getAuth();
    await auth.authStateReady();
    const currentUser = auth.currentUser;

    console.log("CurrentUser:", currentUser?.uid);

    if (!currentUser?.uid) {
      toast.error("Chưa đăng nhập. F5 lại trang");
      return;
    }

    const keyword = search.trim();
    if (!keyword) return;
    setAdding(true);

    try {
      let targetUid: string | null = null;
      const upperKeyword = keyword.toUpperCase();
      const lowerKeyword = keyword.toLowerCase();

      // 1. Ưu tiên userIds - có sẵn trong ảnh bạn gửi
      const userIdSnap = await getDoc(doc(db, "userIds", upperKeyword));
      if (userIdSnap.exists()) {
        targetUid = userIdSnap.data().uid;
        console.log("Found in userIds:", targetUid);
      }

      // 2. Check usernames
      if (!targetUid) {
        const usernameSnap = await getDoc(doc(db, "usernames", lowerKeyword));
        if (usernameSnap.exists()) {
          targetUid = usernameSnap.data().uid;
          console.log("Found in usernames:", targetUid);
        }
      }

      // 3. searchKeywords - đã có index
      if (!targetUid) {
        const q = query(
          collection(db, "users"),
          where("searchKeywords", "array-contains", lowerKeyword),
          limit(1)
        );
        const snap = await getDocs(q);
        console.log("searchKeywords empty:", snap.empty);
        if (!snap.empty) {
          targetUid = snap.docs[0].id;
          console.log("Found in searchKeywords:", targetUid);
        }
      }

      if (!targetUid) {
        toast.error(`Không tìm thấy: ${keyword}`);
        return;
      }

      if (targetUid === currentUser.uid) {
        toast.error("Không thể thêm chính mình");
        return;
      }

      const chatId = [currentUser.uid, targetUid].sort().join("_");
      const friendRef = doc(db, "friends", `${currentUser.uid}_${targetUid}`);

      if (!(await getDoc(friendRef)).exists()) {
        await setDoc(friendRef, {
          userId: currentUser.uid,
          friendId: targetUid,
          createdAt: new Date(),
        });
        await setDoc(
          doc(db, "chats", chatId),
          {
            members: [currentUser.uid, targetUid],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { merge: true }
        );
        toast.success("Đã thêm bạn bè");
      }

      router.push(`/chat/${chatId}`);
      setSearch("");
    } catch (e: any) {
      console.error("Search error:", e.code, e.message);
      toast.error(`Lỗi: ${e.code}`);
    } finally {
      setAdding(false);
    }
  };

  const filtered = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.username.toLowerCase().includes(search.toLowerCase()) ||
      f.userId.includes(search.toUpperCase())
  );

  const formatTime = (time: any) => {
    if (!time ||!time.toDate) return "";
    try {
      return formatDistanceToNow(time.toDate(), {
        addSuffix: true,
        locale: vi,
      }).replace("khoảng ", "");
    } catch {
      return "";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white dark:from-black dark:to-zinc-950">
        <FiLoader className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-black dark:via-zinc-950 dark:to-blue-950/10">
        <div className="sticky top-0 z-30 backdrop-blur-3xl bg-white/80 dark:bg-zinc-950/80 border-b border-gray-200/30 dark:border-zinc-800/30 shadow-sm shadow-gray-900/5">
          <div className="px-5 pt-8 pb-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[32px] font-black tracking-tight bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                  Tin nhắn
                </h1>
                <p className="text-[14px] font-medium text-gray-500 dark:text-zinc-500 mt-0.5">
                  {friends.length} cuộc trò chuyện
                </p>
              </div>
              <button
                onClick={() => toast.info("Tính năng đang phát triển")}
                className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/40 active:scale-90 transition-all duration-200 group overflow-hidden"
              >
                <RiAddLine className="text-white relative z-10" size={24} />
              </button>
            </div>

            <form onSubmit={handleSearch} className="relative group">
              <div
                className={`absolute -inset-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl blur-lg transition-opacity duration-500 ${
                  focused? "opacity-40" : "opacity-0"
                }`}
              />
              <div className="relative flex items-center h-14 bg-gray-100/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-3xl border-[2.5px] border-transparent focus-within:border-blue-500/40 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all duration-300 shadow-lg shadow-gray-900/5">
                <FiSearch
                  className={`ml-5 transition-all duration-300 ${
                    focused? "text-blue-500 scale-110" : "text-gray-400 dark:text-zinc-500"
                  }`}
                  size={22}
                />
                <input
                  type="text"
                  placeholder="Nhập User ID: GQXIFNWT"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="w-full h-full px-4 bg-transparent text-[15px] font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mr-4 w-7 h-7 rounded-full bg-gray-300/80 dark:bg-zinc-700/80 hover:bg-gray-400 dark:hover:bg-zinc-600 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <FiX className="text-gray-600 dark:text-zinc-300" size={16} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="px-4 py-3">
          {loading? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-900 rounded-3xl" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-900 rounded-lg w-1/3" />
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-900 rounded-lg w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0? (
            <div className="flex flex-col items-center justify-center py-28 px-6 text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-3xl blur-3xl" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-900 dark:to-zinc-800 rounded-3xl flex items-center justify-center shadow-2xl shadow-gray-900/10">
                  {search? (
                    <FiSearch className="text-gray-400 dark:text-zinc-600" size={36} />
                  ) : (
                    <FiMessageSquare className="text-gray-400 dark:text-zinc-600" size={36} />
                  )}
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                {search? "Không tìm thấy" : "Chưa có tin nhắn"}
              </h3>
              <p className="text-[15px] text-gray-500 dark:text-zinc-400 font-medium max-w-[260px] mb-8 leading-relaxed">
                {search
                ? `Không có kết quả cho "${search}"`
                  : "Tìm bạn bè bằng User ID để bắt đầu trò chuyện"}
              </p>
              {search && (
                <button
                  onClick={handleSearch}
                  disabled={adding}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-bold text-[15px] rounded-3xl shadow-2xl shadow-blue-500/40 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2.5"
                >
                  {adding? (
                    <>
                      <FiLoader className="animate-spin" size={20} />
                      Đang tìm...
                    </>
                  ) : (
                    <>
                      <FiUserPlus size={20} />
                      Thêm {search}
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((f) => (
                <Link
                  key={f.uid}
                  href={`/chat/${[user?.uid, f.uid].sort().join("_")}`}
                  className="group flex items-center gap-4 p-4 rounded-3xl hover:bg-white dark:hover:bg-zinc-900/70 active:scale-[0.98] transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/5"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-3xl ring-[3px] ring-white dark:ring-zinc-950 shadow-xl shadow-gray-900/10 overflow-hidden group-hover:ring-blue-500/20 transition-all duration-300">
                      <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                    </div>
                    {f.isOnline && (
                      <div className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full ring-[4px] ring-white dark:ring-zinc-950 shadow-lg shadow-emerald-500/50">
                        <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-bold text-[15px] text-gray-900 dark:text-white truncate">
                          {f.name}
                        </p>
                        {f.unreadCount? (
                          <IoSparkles className="text-blue-500 flex-shrink-0" size={16} />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        {f.lastSeen && (
                          <p className="text-[13px] text-gray-400 dark:text-zinc-500 font-semibold">
                            {formatTime(f.lastSeen)}
                          </p>
                        )}
                        {f.unreadCount? (
                          <div className="min-w-[24px] h-6 px-2 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40">
                            <span className="text-[12px] font-black text-white">{f.unreadCount}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-[14px] text-gray-500 dark:text-zinc-400 font-medium truncate">
                      {f.lastMessage || `@${f.username} · ${f.userId}`}
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