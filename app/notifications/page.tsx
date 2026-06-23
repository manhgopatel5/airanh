"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { getFirebaseDB } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy,
  Timestamp, writeBatch, limit, startAfter, getDocs
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { FiCheck, FiTrash2, FiBell, FiArrowLeft, FiUserPlus, FiAtSign, FiInbox, FiUsers, FiHeart, FiMessageCircle } from "react-icons/fi";
import { toast, Toaster } from "sonner";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";

type Notification = {
  id: string;
  toUserId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  type: "like" | "comment" | "friend_request" | "task_apply" | "system" | "group_invite" | "mention";
  content: string;
  isRead: boolean;
  createdAt: Timestamp;
  link?: string;
};

export default function NotificationsPage() {
  const db = getFirebaseDB();
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id,...d.data() } as Notification));
      setNotifications(list);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error("Không tải được thông báo");
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (!lastDoc || loadingMore ||!user?.uid) return;
    setLoadingMore(true);
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", user.uid),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(30)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      setLastDoc(null);
      setLoadingMore(false);
      return;
    }
    const newNotifs = snap.docs.map((d) => ({ id: d.id,...d.data() } as Notification));
    setNotifications((prev) => [...prev,...newNotifs]);
    setLastDoc(snap.docs[snap.docs.length - 1]?? null);
    setLoadingMore(false);
  }, [lastDoc, loadingMore, user?.uid]);

  const groupedNotifs = useMemo(() => {
    const groups: { "Hôm nay": Notification[]; "Hôm qua": Notification[]; "Cũ hơn": Notification[] } = {
      "Hôm nay": [],
      "Hôm qua": [],
      "Cũ hơn": [],
    };
    notifications.forEach((n) => {
      const date = n.createdAt?.toDate? n.createdAt.toDate() : new Date(0);
      if (isToday(date)) groups["Hôm nay"].push(n);
      else if (isYesterday(date)) groups["Hôm qua"].push(n);
      else groups["Cũ hơn"].push(n);
    });
    return groups;
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.filter((n) =>!n.isRead).length, [notifications]);

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <FiHeart className="text-[#ff3b30]" size={18} />;
      case "comment": return <FiMessageCircle className="text-[#0a84ff]" size={18} />;
      case "friend_request": return <FiUserPlus className="text-[#0a84ff]" size={18} />;
      case "group_invite": return <FiUsers className="text-[#ff9500]" size={18} />;
      case "mention": return <FiAtSign className="text-[#af52de]" size={18} />;
      case "task_apply": return <FiInbox className="text-[#30d158]" size={18} />;
      default: return <FiBell className="text-zinc-500" size={18} />;
    }
  };

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id? {...n, isRead: true } : n));
    try {
      await updateDoc(doc(db, "notifications", id), { isRead: true });
    } catch {
      toast.error("Lỗi đánh dấu đã đọc");
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) =>!n.isRead).map((n) => n.id);
    if (!unreadIds.length) return;
    setNotifications((prev) => prev.map((n) => ({...n, isRead: true })));
    try {
      const batch = writeBatch(db);
      unreadIds.forEach((id) => batch.update(doc(db, "notifications", id), { isRead: true }));
      await batch.commit();
      toast.success("Đã đọc tất cả");
    } catch {
      toast.error("Lỗi");
    }
  }, [notifications]);

  const deleteNotif = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id!== id));
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch {
      toast.error("Lỗi xóa");
    }
  }, []);

  const deleteSelected = useCallback(async () => {
    if (!selectedIds.length) return;
    const toDelete = [...selectedIds];
    setSelectedIds([]);
    setNotifications((prev) => prev.filter((n) =>!toDelete.includes(n.id)));
    try {
      const batch = writeBatch(db);
      toDelete.forEach((id) => batch.delete(doc(db, "notifications", id)));
      await batch.commit();
      toast.success(`Đã xóa ${toDelete.length} thông báo`);
    } catch {
      toast.error("Lỗi xóa");
    }
  }, [selectedIds]);



  const formatTime = (time: Timestamp | null) => {
    if (!time?.toDate) return "";
    try {
      return formatDistanceToNow(time.toDate(), { addSuffix: true, locale: vi });
    } catch {
      return "";
    }
  };

  const handleClickNotif = useCallback((n: Notification) => {
    if (!n.isRead) markAsRead(n.id);
    if (n.link) {
      if (n.link.startsWith("/")) router.push(n.link);
      else window.open(n.link, "_blank");
    }
  }, [markAsRead, router]);

  if (loading) return <Skeleton />;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A]">
      <Toaster richColors position="top-center" />
      
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center -ml-1 active:scale-95 transition-transform">
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text- font-bold">Thông báo</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-[#8e8e93] mt-0.5">{unreadCount} chưa đọc</p>
              )}
            </div>
          </div>
          {selectedIds.length > 0? (
            <div className="flex gap-2">
              <button onClick={deleteSelected} className="p-2 bg-red-500/10 text-red-500 rounded-xl active:scale-95">
                <FiTrash2 size={18} />
              </button>
              <button onClick={() => setSelectedIds([])} className="px-3 py-2 text-sm font-[600] active:scale-95">Hủy</button>
            </div>
          ) : unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-sm font-[600] text-[#0a84ff] flex items-center gap-1.5 active:scale-95">
              <FiCheck size={18} />
              Đọc tất cả
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-24 px-4 pt-4">
        {notifications.length === 0? (
          <div className="flex flex-col items-center justify-center min-h- py-20 text-center">
            <div className="w- h- bg-zinc-100 dark:bg-zinc-900 rounded-[20px] flex items-center justify-center mb-4">
              <FiBell className="text-zinc-400" size={30} strokeWidth={1.5} />
            </div>
            <h3 className="text- font-[600] mb-1.5">Chưa có thông báo</h3>
            <p className="text- text-[#8e8e93] dark:text-zinc-500 max-w-[280px] leading-">Thông báo về lời mời kết bạn, nhóm và tin nhắn sẽ hiện ở đây</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedNotifs).map(([date, items]) => {
              if (!items.length) return null;
              return (
                <div key={date}>
                  <p className="text-xs font-[700] text-[#8e8e93] uppercase tracking-wider mb-2 px-1">{date}</p>
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] shadow-sm overflow-hidden">
                    {items.map((n, i) => (
                      <div
                        key={n.id}
                        data-id={n.id}
                        ref={(node) => setObserver(node, n.isRead, n.id)}
                        className={`p-3 flex items-start gap-3 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors ${
                         !n.isRead? "bg-[#0a84ff]/[0.04]" : ""
                        } ${i!== items.length - 1? "border-b border-black/[0.06] dark:border-white/[0.06]" : ""}`}
                      >
                        <div className="relative mt-0.5 flex-shrink-0">
                          <img 
                            src={n.fromUserAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(n.fromUserName)}`} 
                            className="w-12 h-12 rounded-full object-cover" 
                          />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-black rounded-full flex items-center justify-center border-2 border-white dark:border-black">
                            {getIcon(n.type)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleClickNotif(n)}>
                          <p className="text- leading-">
                            <span className="font-[600]">{n.fromUserName}</span> 
                            <span className="text-zinc-600 dark:text-zinc-300"> {n.content}</span>
                          </p>
                          <p className="text- text-[#8e8e93] mt-0.5">{formatTime(n.createdAt)}</p>
                        </div>
                        <button
                          onClick={() => deleteNotif(n.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {lastDoc && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-3 text-sm text-[#0a84ff] font-[600] active:scale-95 transition-transform mt-4"
          >
            {loadingMore? "Đang tải..." : "Tải thêm"}
          </button>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A]">
      <div className="bg-white/80 dark:bg-zinc-950/80 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
        <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
      </div>
      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] animate-pulse">
            <div className="flex gap-3">
              <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}