"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { doc, onSnapshot, deleteDoc, getDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { FiLoader, FiCheck, FiX, FiMessageCircle } from "react-icons/fi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function StrangerStatusBanners() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const pathname = usePathname() || "";

  const [inQueue, setInQueue] = useState(false);
  const [matchedChatId, setMatchedChatId] = useState<string | null>(null);
  const [dismissedMatchId, setDismissedMatchId] = useState<string | null>(null);
  const matchedToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setInQueue(false);
      setMatchedChatId(null);
      return;
    }

    const unsub = onSnapshot(doc(db, "stranger_queue", user.uid), (snap) => {
      const data = snap.data();
      if (data?.matchedChatId) {
        setMatchedChatId(data.matchedChatId as string);
        setInQueue(false);
        if (matchedToastRef.current !== data.matchedChatId) {
          matchedToastRef.current = data.matchedChatId as string;
          toast.success("Đã tìm thấy bạn phù hợp!", { duration: 4000 });
        }
      } else if (data?.status === "waiting") {
        setInQueue(true);
        setMatchedChatId(null);
        matchedToastRef.current = null;
      } else {
        setInQueue(false);
        setMatchedChatId(null);
        matchedToastRef.current = null;
      }
    });

    return () => unsub();
  }, [user?.uid, db]);

  const handleCancelQueue = useCallback(async () => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, "stranger_queue", user.uid));
      toast.info("Đã hủy tìm kiếm");
    } catch {
      toast.error("Lỗi hủy hàng đợi");
    }
  }, [user?.uid, db]);

  const enterChat = useCallback(async () => {
    if (!matchedChatId || !user?.uid) return;
    try {
      const chatSnap = await getDoc(doc(db, "stranger_chats", matchedChatId));
      if (chatSnap.exists()) {
        router.push(`/stranger/${matchedChatId}`);
        deleteDoc(doc(db, "stranger_queue", user.uid)).catch(() => {});
      } else {
        toast.error("Phòng chat chưa sẵn sàng, thử lại sau");
      }
    } catch {
      toast.error("Không thể vào phòng chat");
    }
  }, [matchedChatId, user?.uid, db, router]);

  const onStrangerPage = pathname.startsWith("/stranger");
  const onMatchedChat = matchedChatId && pathname === `/stranger/${matchedChatId}`;
  const showMatchBanner = matchedChatId && !onMatchedChat && dismissedMatchId !== matchedChatId;
  const showQueueBanner = inQueue && !onStrangerPage;

  if (!user?.uid) return null;

  return (
    <AnimatePresence>
      {showMatchBanner && (
        <motion.div
          key="match"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed top-[calc(env(safe-area-inset-top)+8px)] left-3 right-3 z-[60] max-w-2xl mx-auto"
        >
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl shadow-xl shadow-green-900/20 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <FiCheck size={20} />
            </div>
            <button type="button" onClick={enterChat} className="flex-1 text-left min-w-0">
              <p className="text-sm font-[800]">Đã tìm thấy bạn!</p>
              <p className="text-xs text-green-100 truncate">Bấm để vào phòng chat ngay</p>
            </button>
            <button
              type="button"
              onClick={enterChat}
              className="h-9 px-3 rounded-xl bg-white text-green-700 text-xs font-[800] shrink-0 active:scale-95 transition-transform flex items-center gap-1"
            >
              <FiMessageCircle size={14} />
              Vào chat
            </button>
            <button
              type="button"
              onClick={() => setDismissedMatchId(matchedChatId)}
              className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 active:scale-95"
              aria-label="Đóng"
            >
              <FiX size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {showQueueBanner && (
        <motion.div
          key="queue"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={cn(
            "fixed left-3 right-3 z-[55] max-w-2xl mx-auto",
            showMatchBanner
              ? "top-[calc(env(safe-area-inset-top)+76px)]"
              : "top-[calc(env(safe-area-inset-top)+8px)]"
          )}
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xl shadow-blue-900/20 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <FiLoader className="animate-spin" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-[800]">Đang tìm bạn phù hợp...</p>
              <p className="text-xs text-blue-100 truncate">Bạn có thể dùng app bình thường, sẽ thông báo khi match</p>
            </div>
            <button
              type="button"
              onClick={handleCancelQueue}
              className="h-9 px-3 rounded-xl bg-white/15 text-xs font-[700] shrink-0 active:scale-95 transition-transform"
            >
              Hủy
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
