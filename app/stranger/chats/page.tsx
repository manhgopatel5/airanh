"use client";
import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, arrayRemove } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { FiSearch, FiTrash2, FiX, FiMessageCircle, FiClock } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatItem {
  id: string;
  partnerName: string;
  partnerAvatar: string;
  partnerId: string;
  lastMessage: string;
  lastMessageTime: any;
  unreadCount: number;
  isPartnerOnline: boolean;
  status: "active" | "ended" | "waiting";
  members: string[];
}

export default function ChatsPage() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "stranger_chats"),
      where("members", "array-contains", user.uid),
      orderBy("lastMessageTime", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const chatList = snap.docs.map(d => {
        const data = d.data();
        const partnerIdx = data.members.findIndex((m: string) => m!== user.uid);
        return {
          id: d.id,
          partnerName: data.partnerNames?.[partnerIdx] || "Người lạ",
          partnerAvatar: data.partnerAvatars?.[partnerIdx] || "",
          partnerId: data.members[partnerIdx] || "",
          lastMessage: data.lastMessage || "Bắt đầu trò chuyện",
          lastMessageTime: data.lastMessageTime?.toMillis() || 0,
          unreadCount: data.unreadCounts?.[user.uid] || 0,
          isPartnerOnline: data.onlineStatus?.[data.members[partnerIdx]] || false,
          status: data.status || "active",
          members: data.members,
        } as ChatItem;
      });
      setChats(chatList);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid, db]);

  const filteredChats = useMemo(() => {
    if (!search) return chats;
    return chats.filter(c =>
      c.partnerName.toLowerCase().includes(search.toLowerCase())
    );
  }, [chats, search]);

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
      // Xóa user khỏi members để ẩn chat
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
      <div className="p-4 space-y-3">
        <div className="h-8 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
        {[1,2,3].map(i => (
          <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-[800]">Chat của bạn</h1>
            <button
              onClick={() => router.push("/stranger")}
              className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center active:scale-90"
            >
              <FiMessageCircle size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên..."
              className="w-full h-11 pl-10 pr-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-sm outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <FiX className="text-zinc-400" size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredChats.map(chat => (
            <motion.div
              key={chat.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => router.push(`/stranger/${chat.id}`)}
              className={cn(
                "p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 active:scale-[0.98] transition-all",
                chat.status === "ended" && "opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <img
                    src={chat.partnerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.partnerName)}&background=random`}
                    alt={chat.partnerName}
                    className="w-12 h-12 rounded-2xl object-cover"
                  />
                  {chat.isPartnerOnline && chat.status === "active" && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-[700] truncate">
                        {chat.status === "ended"? "Đã kết thúc" : chat.partnerName}
                      </p>
                      {chat.status === "waiting" && (
                        <FiClock size={14} className="text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-zinc-400 flex-shrink-0">
                      {formatTime(chat.lastMessageTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-500 truncate">
                      {chat.lastMessage}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-[11px] font-[800] rounded-full flex items-center justify-center">
                        {chat.unreadCount > 99? "99+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {chat.status === "active" && (
                    <button
                      onClick={(e) => handleEndChat(chat.id, e)}
                      className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center active:scale-90"
                      title="Kết thúc"
                    >
                      <FiX size={16} className="text-zinc-600 dark:text-zinc-400" />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(chat.id)}
                    className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center active:scale-90"
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
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-3 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center">
              <FiMessageCircle className="text-zinc-400" size={28} />
            </div>
            <p className="text-zinc-500 font-[600]">
              {search? "Không tìm thấy cuộc trò chuyện" : "Chưa có cuộc trò chuyện nào"}
            </p>
            {!search && (
              <button
                onClick={() => router.push("/stranger")}
                className="mt-4 px-6 h-11 bg-blue-600 text-white rounded-xl font-[700] active:scale-95"
              >
                Tìm bạn mới
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-[800] mb-2">Xóa cuộc trò chuyện?</h3>
              <p className="text-sm text-zinc-500 mb-6">
                Bạn sẽ không thấy lại cuộc trò chuyện này nữa. Người kia vẫn có thể xem.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-[700] active:scale-95"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleDeleteChat(confirmDelete)}
                  className="flex-1 h-11 bg-red-600 text-white rounded-xl font-[700] active:scale-95"
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