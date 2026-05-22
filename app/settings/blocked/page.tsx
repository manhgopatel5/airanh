"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayRemove,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import {
  ChevronLeft,
  Search,
  Loader2,
  Shield,
  X,
  UserX
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";

type BlockedUserItem = {
  uid: string;
  blockedAt: Timestamp;
};

type BlockedUser = {
  uid: string;
  name: string;
  avatar: string;
  userId: string;
  username?: string;
  blockedAt: Date;
};

export default function BlockedPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();

  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<BlockedUser | null>(null);

  // Load blocked users
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      async (snap) => {
        if (!snap.exists()) {
          setBlocked([]);
          setLoading(false);
          return;
        }

        const blockedData: (BlockedUserItem | string)[] =
          snap.data().settings?.blockedUsers || [];

        if (blockedData.length === 0) {
          setBlocked([]);
          setLoading(false);
          return;
        }

        try {
          const users = await Promise.all(
            blockedData.map(async (item) => {
              const uid = typeof item === 'string'? item : item.uid;
              const blockedAt = typeof item === 'string'
               ? new Date()
                : item.blockedAt?.toDate?.() || new Date();

              const userSnap = await getDoc(doc(db, "users", uid));
              if (!userSnap.exists()) return null;

              const data = userSnap.data();
              return {
                uid,
                name: data.name || "Người dùng",
                avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || "U")}&background=random`,
                userId: data.userId || uid.slice(0, 8),
                username: data.username,
                blockedAt,
              } as BlockedUser;
            })
          );

          setBlocked(users.filter(Boolean) as BlockedUser[]);
        } catch (err) {
          console.error("Load blocked users error:", err);
          toast.error("Lỗi tải danh sách");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Snapshot error:", err);
        toast.error("Không thể theo dõi danh sách");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, db]);

  const handleUnblock = async () => {
    if (!user ||!confirmUser || unblocking) return;

    const { uid, name } = confirmUser;
    setUnblocking(uid);
    setConfirmUser(null);

    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const blockedList: (BlockedUserItem | string)[] =
        userSnap.data()?.settings?.blockedUsers || [];

      const itemToRemove = blockedList.find((item) =>
        typeof item === 'string'? item === uid : item.uid === uid
      );

      if (!itemToRemove) {
        toast.error("Không tìm thấy người dùng");
        return;
      }

      await updateDoc(doc(db, "users", user.uid), {
        "settings.blockedUsers": arrayRemove(itemToRemove)
      });

      toast.success(`Đã bỏ chặn ${name}`);
      if ("vibrate" in navigator) navigator.vibrate(8);
    } catch (err) {
      console.error("Unblock error:", err);
      toast.error("Bỏ chặn thất bại");
    } finally {
      setUnblocking(null);
    }
  };

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return blocked;
    return blocked.filter((u) =>
      u.name.toLowerCase().includes(query) ||
      u.userId.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query)
    );
  }, [blocked, search]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days < 1) return "Hôm nay";
    if (days < 7) return `${days} ngày trước`;
    if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
    if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center gap-3 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10 border-b border-gray-100 dark:border-zinc-900">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 active:scale-90 transition rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900"
        >
          <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Đã chặn
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
            {blocked.length} người dùng
          </p>
        </div>
      </div>

      <div className="px-6 mt-4">
        {/* Search */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-zinc-900 mb-4">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, ID..."
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400 text-[15px]"
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={() => setSearch("")}
                className="p-1"
              >
                <X className="w-4 h-4 text-gray-400" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Loading */}
        {loading? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
                </div>
                <div className="w-20 h-9 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0? (
          /* Empty State */
          <div className="text-center py-16">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-gray-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              {search? (
                <Search className="w-8 h-8 text-gray-300 dark:text-zinc-700" />
              ) : (
                <Shield className="w-8 h-8 text-gray-300 dark:text-zinc-700" />
              )}
            </motion.div>
            <p className="text-gray-500 dark:text-zinc-400 font-medium">
              {search? "Không tìm thấy" : "Chưa chặn ai"}
            </p>
            <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1">
              {search? "Thử từ khóa khác" : "Người bị chặn sẽ hiện ở đây"}
            </p>
          </div>
        ) : (
          /* List */
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((u) => (
                <motion.div
                  key={u.uid}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                      src={u.avatar}
                      className="w-12 h-12 rounded-full object-cover bg-gray-200 dark:bg-zinc-800 flex-shrink-0"
                      alt={u.name}
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white truncate">
                        {u.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                        @{u.username || u.userId}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                        Chặn {formatDate(u.blockedAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmUser(u)}
                    disabled={unblocking === u.uid}
                    className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-zinc-800 text-sm font-semibold text-gray-900 dark:text-white active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0 hover:bg-gray-300 dark:hover:bg-zinc-700"
                  >
                    {unblocking === u.uid? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Bỏ chặn"
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog.Root open={!!confirmUser} onOpenChange={(open) =>!open && setConfirmUser(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 z-50 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <UserX className="w-8 h-8 text-red-500" />
              </div>
              <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Bỏ chặn {confirmUser?.name}?
              </Dialog.Title>
              <Dialog.Description className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
                Họ sẽ có thể xem hồ sơ và nhắn tin cho bạn lại.
              </Dialog.Description>
            </div>
            <div className="flex gap-3">
              <Dialog.Close className="flex-1 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold active:scale-95 transition-all">
                Hủy
              </Dialog.Close>
              <button
                onClick={handleUnblock}
                className="flex-1 h-12 rounded-2xl bg-red-500 text-white font-semibold active:scale-95 transition-all"
              >
                Bỏ chặn
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}