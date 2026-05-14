"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy, Timestamp, writeBatch, limit, startAfter, getDocs } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { FiCheck, FiTrash2, FiBell, FiHeart, FiMessageCircle, FiUserPlus, FiBriefcase } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

type Notification = {
  id: string; toUserId: string; fromUserId: string; fromUserName: string; fromUserAvatar: string;
  type: "like" | "comment" | "friend_request" | "task_apply" | "system";
  content: string; isRead: boolean; createdAt: Timestamp; link?: string;
};

export default function NotificationsPage() {
  const db = getFirebaseDB();
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "notifications"), where("toUserId", "==", user.uid), orderBy("createdAt", "desc"), limit(30));
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id,...d.data() } as Notification)));
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setLoading(false);
    }, () => { toast.error("Không tải được thông báo"); setLoading(false); });
    return () => unsub();
  }, [user?.uid, db]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const loadMore = useCallback(async () => {
    if (!lastDoc || loadingMore ||!user?.uid) return;
    setLoadingMore(true);
    const q = query(collection(db, "notifications"), where("toUserId", "==", user.uid), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(30));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setNotifications((prev) => [...prev,...snap.docs.map((d) => ({ id: d.id,...d.data() } as Notification))]);
      setLastDoc(snap.docs[snap.docs.length - 1]);
    } else setLastDoc(null);
    setLoadingMore(false);
  }, [lastDoc, loadingMore, user?.uid, db]);

  const groupedNotifs = useMemo(() => {
    const groups: Record<string, Notification[]> = { "Hôm nay": [], "Hôm qua": [], "Cũ hơn": [] };
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    notifications.forEach((n) => {
      const date = n.createdAt?.toDate() || new Date(0);
      if (date >= today) groups["Hôm nay"].push(n);
      else if (date >= yesterday) groups["Hôm qua"].push(n);
      else groups["Cũ hơn"].push(n);
    });
    return groups;
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.filter((n) =>!n.isRead).length, [notifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id? {...n, isRead: true } : n));
    try { await updateDoc(doc(db, "notifications", id), { isRead: true }); } catch {}
  }, [db]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) =>!n.isRead).map((n) => n.id);
    if (!unreadIds.length) return;
    setNotifications((prev) => prev.map((n) => ({...n, isRead: true })));
    try {
      const batch = writeBatch(db);
      unreadIds.slice(0, 450).forEach((id) => batch.update(doc(db, "notifications", id), { isRead: true }));
      await batch.commit();
      toast.success("Đã đánh dấu tất cả đã đọc");
      navigator.vibrate?.(8);
    } catch { toast.error("Lỗi"); }
  }, [notifications, db]);

  const deleteNotif = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id!== id));
    try { await deleteDoc(doc(db, "notifications", id)); } catch { toast.error("Lỗi xóa"); }
  }, [db]);

  const deleteSelected = useCallback(async () => {
    if (!selectedIds.length) return;
    setNotifications((prev) => prev.filter((n) =>!selectedIds.includes(n.id)));
    try {
      const batch = writeBatch(db);
      selectedIds.forEach((id) => batch.delete(doc(db, "notifications", id)));
      await batch.commit();
      toast.success(`Đã xóa ${selectedIds.length} thông báo`);
      setSelectedIds([]);
      navigator.vibrate?.(8);
    } catch { toast.error("Lỗi xóa"); }
  }, [selectedIds, db]);

  const setObserver = useCallback((node: HTMLDivElement | null, isRead: boolean, id: string) => {
    if (!node || isRead) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) markAsRead(id); });
      }, { threshold: 0.5 });
    }
    observerRef.current.observe(node);
  }, [markAsRead]);

  const formatTime = (time: Timestamp | null) => time? formatDistanceToNow(time.toDate(), { addSuffix: true, locale: vi }) : "";

  const handleClickNotif = useCallback((n: Notification) => {
    if (!n.isRead) markAsRead(n.id);
    if (n.link) router.push(n.link);
    navigator.vibrate?.(5);
  }, [markAsRead, router]);

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <FiHeart className="w-4 h-4 text-pink-500" />;
      case "comment": return <FiMessageCircle className="w-4 h-4 text-blue-500" />;
      case "friend_request": return <FiUserPlus className="w-4 h-4 text-emerald-500" />;
      case "task_apply": return <FiBriefcase className="w-4 h-4 text-amber-500" />;
      default: return <FiBell className="w-4 h-4 text-zinc-500" />;
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
      <LottiePlayer animationData={loadingPull} loop autoplay className="w-20 h-20" />
    </div>
  );

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-28">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight">Thông báo</h1>
              {unreadCount > 0 && <p className="text-xs text-zinc-500 -mt-0.5">{unreadCount} chưa đọc</p>}
            </div>
            <AnimatePresence mode="wait">
              {selectedIds.length > 0? (
                <motion.div key="select" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-2">
                  <button onClick={deleteSelected} className="h-9 px-3 rounded-xl bg-red-500 text-white font-bold text-sm flex items-center gap-1.5 active:scale-95">
                    <FiTrash2 size={16} /> Xóa ({selectedIds.length})
                  </button>
                  <button onClick={() => setSelectedIds([])} className="h-9 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 font-semibold text-sm">Hủy</button>
                </motion.div>
              ) : unreadCount > 0? (
                <motion.button key="read" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={markAllAsRead} className="h-9 px-3 rounded-xl bg-[#E8F1FF] dark:bg-[#0042B2]/20 text-[#0042B2] font-bold text-sm flex items-center gap-1.5 active:scale-95">
                  <FiCheck size={16} /> Đọc hết
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {notifications.length === 0? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="w-24 h-24 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-4">
                <FiBell size={40} className="text-zinc-400" />
              </div>
              <h3 className="font-black text-lg mb-1">Chưa có thông báo</h3>
              <p className="text-sm text-zinc-500">Khi có người tương tác, bạn sẽ thấy ở đây</p>
            </div>
          ) : (
            Object.entries(groupedNotifs).map(([date, items]) =>!items.length? null : (
              <div key={date} className="mt-6 first:mt-4">
                <div className="px-4 mb-2.5">
                  <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{date}</h2>
                </div>
                <div className="px-4 space-y-2.5">
                  {items.map((n, idx) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      data-id={n.id}
                      ref={(node) => setObserver(node, n.isRead, n.id)}
                      onClick={() => selectedIds.length? setSelectedIds((prev) => prev.includes(n.id)? prev.filter(id => id!== n.id) : [...prev, n.id]) : handleClickNotif(n)}
                      onLongPress={() => setSelectedIds((prev) => prev.includes(n.id)? prev : [...prev, n.id])}
                      className={`group relative bg-white dark:bg-zinc-950 rounded-3xl p-4 border-2 transition-all active:scale-[0.98] cursor-pointer ${n.isRead? "border-zinc-200/60 dark:border-zinc-800" : "border-[#0042B2]/30 bg-[#F5F9FF] dark:bg-[#0042B2]/5"} ${selectedIds.includes(n.id)? "ring-2 ring-[#0042B2] border-[#0042B2]" : ""}`}
                    >
                      {!n.isRead && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#0042B2] animate-pulse" />}
                      {selectedIds.includes(n.id) && <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#0042B2] flex items-center justify-center"><FiCheck className="w-3 h-3 text-white" /></div>}

                      <div className="flex items-start gap-3.5">
                        <div className="relative flex-shrink-0">
                          <img src={n.fromUserAvatar || `https://ui-avatars.com/api/?name=${n.fromUserName}`} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white dark:ring-zinc-950 shadow-sm" alt="" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-xl bg-white dark:bg-zinc-950 border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-md">
                            {getIcon(n.type)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text- leading-snug">
                            <span className="font-bold text-zinc-900 dark:text-white">{n.fromUserName}</span>
                            <span className="text-zinc-700 dark:text-zinc-300"> {n.content}</span>
                          </p>
                          <p className="text-xs text-zinc-500 mt-1.5 flex items-center gap-1.5">
                            <span>{formatTime(n.createdAt)}</span>
                            {n.link && <><span>•</span><span className="text-[#0042B2] font-medium">Xem chi tiết</span></>}
                          </p>
                        </div>

                        <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }} className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-all flex-shrink-0">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}

          {lastDoc && (
            <div className="px-4 mt-6">
              <button onClick={loadMore} disabled={loadingMore} className="w-full h-11 rounded-2xl bg-white dark:bg-zinc-950 border-zinc-200/60 dark:border-zinc-800 font-semibold text-sm active:scale-[0.98] disabled:opacity-50 shadow-sm">
                {loadingMore? <LottiePlayer animationData={loadingPull} loop autoplay className="w-5 h-5 mx-auto" /> : "Tải thêm thông báo"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}