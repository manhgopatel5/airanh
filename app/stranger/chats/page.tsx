"use client";

import { useAuth } from "@/lib/AuthContext";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  FiSearch,
  FiTrash2,
  FiX,
  FiMessageCircle,
  FiClock,
  FiArrowLeft,
  FiZap,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchPartnerProfile,
  partnerFromChatData,
  partnerOnline,
  unreadForUser,
} from "@/lib/strangerPartners";

interface ChatItem {
  id: string;
  partnerName: string;
  partnerAvatar: string;
  partnerId: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  isPartnerOnline: boolean;
  status: "active" | "ended" | "waiting";
  members: string[];
}

type FilterTab = "all" | "active" | "ended";

export default function ChatsPage() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "stranger_chats"),
      where("members", "array-contains", user.uid),
      orderBy("lastMessageTime", "desc")
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const list = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data();
            const partnerId =
              (data.members as string[] | undefined)?.find((m) => m !== user.uid) || "";
            let partner = partnerFromChatData(data, partnerId);
            if (!partner.name || partner.name === "Người lạ") {
              partner = await fetchPartnerProfile(partnerId);
            }

            return {
              id: d.id,
              partnerName: partner.name,
              partnerAvatar: partner.avatar,
              partnerId,
              lastMessage: (data.lastMessage as string) || "Bắt đầu trò chuyện",
              lastMessageTime: data.lastMessageTime?.toMillis?.() || 0,
              unreadCount: unreadForUser(data, user.uid),
              isPartnerOnline: partnerOnline(data, partnerId),
              status: (data.status as ChatItem["status"]) || "active",
              members: (data.members as string[]) || [],
            } satisfies ChatItem;
          })
        );
        setChats(list);
        setLoading(false);
      },
      (error) => {
        console.error("Chats snapshot error:", error);
        toast.error("Lỗi tải danh sách chat");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, db]);

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chats.filter((c) => {
      if (filter === "active" && c.status !== "active") return false;
      if (filter === "ended" && c.status !== "ended") return false;
      if (!q) return true;
      return (
        c.partnerName.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [chats, search, filter]);

  const formatTime = (timestamp: number) => {
    if (!timestamp) return "";
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút`;
    if (hours < 24) return `${hours} giờ`;
    if (days < 7) return `${days} ngày`;
    return new Date(timestamp).toLocaleDateString("vi-VN");
  };

  const handleEndChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "stranger_chats", chatId), {
        status: "ended",
        endedAt: new Date(),
      });
      toast.success("Đã kết thúc cuộc trò chuyện");
    } catch {
      toast.error("Lỗi kết thúc chat");
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await updateDoc(doc(db, "stranger_chats", chatId), {
        members: arrayRemove(user?.uid),
      });
      toast.success("Đã xóa cuộc trò chuyện");
      setConfirmDelete(null);
    } catch {
      toast.error("Lỗi xóa chat");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 p-4 dark:bg-black">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="h-8 w-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto max-w-2xl space-y-3 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/stranger")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 active:scale-95 dark:bg-zinc-800"
            >
              <FiArrowLeft size={18} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-[800]">Chat người lạ</h1>
              <p className="text-xs text-zinc-500">{chats.length} cuộc trò chuyện</p>
            </div>
            <button
              onClick={() => router.push("/stranger")}
              className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-3 text-white active:scale-95"
            >
              <FiZap size={16} />
              <span className="text-xs font-bold">Tìm mới</span>
            </button>
          </div>

          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc tin nhắn..."
              className="h-11 w-full rounded-xl bg-zinc-100 pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <FiX className="text-zinc-400" size={18} />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {([
              ["all", "Tất cả"],
              ["active", "Đang chat"],
              ["ended", "Đã kết thúc"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition",
                  filter === id
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-2 p-4">
        <AnimatePresence mode="popLayout">
          {filteredChats.map((chat) => (
            <motion.div
              key={chat.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={() => router.push(`/stranger/${chat.id}`)}
              className={cn(
                "cursor-pointer rounded-2xl border border-zinc-200 bg-white p-4 transition active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900",
                chat.status === "ended" && "opacity-70"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src={
                      chat.partnerAvatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.partnerName)}&background=random`
                    }
                    alt={chat.partnerName}
                    className="h-12 w-12 rounded-2xl object-cover"
                  />
                  {chat.isPartnerOnline && chat.status === "active" && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 dark:border-zinc-900" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate font-[700]">
                        {chat.status === "ended" ? "Đã kết thúc" : chat.partnerName}
                      </p>
                      <span className="shrink-0 rounded-md bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-bold text-pink-600 dark:text-pink-400">
                        Người lạ
                      </span>
                      {chat.status === "waiting" && <FiClock size={14} className="shrink-0 text-amber-500" />}
                    </div>
                    <span className="shrink-0 text-xs text-zinc-400">{formatTime(chat.lastMessageTime)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-zinc-500">{chat.lastMessage}</p>
                    {chat.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-[800] text-white">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {chat.status === "active" && (
                    <button
                      onClick={(e) => handleEndChat(chat.id, e)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 active:scale-90 dark:bg-zinc-800"
                      title="Kết thúc"
                    >
                      <FiX size={16} className="text-zinc-600 dark:text-zinc-400" />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(chat.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 active:scale-90 dark:bg-red-900/20"
                    title="Xóa"
                  >
                    <FiTrash2 size={16} className="text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredChats.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
              <FiMessageCircle className="text-zinc-400" size={28} />
            </div>
            <p className="font-[600] text-zinc-500">
              {search || filter !== "all" ? "Không tìm thấy cuộc trò chuyện" : "Chưa có cuộc trò chuyện nào"}
            </p>
            {!search && filter === "all" && (
              <button
                onClick={() => router.push("/stranger")}
                className="mt-4 h-11 rounded-xl bg-blue-600 px-6 font-[700] text-white active:scale-95"
              >
                Tìm bạn mới
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-6 dark:bg-zinc-900"
            >
              <h3 className="mb-2 text-lg font-[800]">Xóa cuộc trò chuyện?</h3>
              <p className="mb-6 text-sm text-zinc-500">
                Bạn sẽ không thấy lại cuộc trò chuyện này. Người kia vẫn có thể xem.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="h-11 flex-1 rounded-xl bg-zinc-100 font-[700] active:scale-95 dark:bg-zinc-800"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleDeleteChat(confirmDelete)}
                  className="h-11 flex-1 rounded-xl bg-red-600 font-[700] text-white active:scale-95"
                >
                  Xóa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
