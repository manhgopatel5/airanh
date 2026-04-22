"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy,
  Timestamp, writeBatch, limit, startAfter, getDocs
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { FiCheck, FiTrash2, FiBell, FiX } from "react-icons/fi";
import { toast, Toaster } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

type Notification = {
  id: string;
  toUserId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  type: "like" | "comment" | "friend_request" | "task_apply" | "system";
  content: string;
  isRead: boolean;
  createdAt: Timestamp;
  link?: string;
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /* ================= LOAD NOTIFICATIONS ================= */
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id,...d.data() } as Notification));
        setNotifications(list);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Không tải được thông báo. Cần tạo index Firestore.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  /* ================= CLEANUP OBSERVER ✅ FIX ================= */
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
    setLastDoc(snap.docs[snap.docs.length - 1]);
    setLoadingMore(false);
  }, [lastDoc, loadingMore, user?.uid]);

  /* ================= GROUP BY DATE ================= */
  const groupedNotifs = useMemo(() => {
    const groups: Record<string, Notification[]> = { "Hôm nay": [], "Hôm qua": [], "Cũ hơn": [] };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    notifications.forEach((n) => {
      const date = n.createdAt?.toDate() || new Date();
      if (date >= today) groups["Hôm nay"].push(n);
      else if (date >= yesterday) groups["Hôm qua"].push(n);
      else groups["Cũ hơn"].push(n);
    });
    return groups;
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.filter((n) =>!n.isRead).length, [notifications]);

  /* ================= ACTIONS ================= */
  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id? {...n, isRead: true } : n));
    try {
      await updateDoc(doc(db, "notifications", id), { isRead: true });
    } catch {
      setNotifications((prev) => prev.map((n) => n.id === id? {...n, isRead: false } : n));
      toast.error("Lỗi đánh dấu đã đọc");
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) =>!n.isRead).map((n) => n.id);
    if (!unreadIds.length) return;

    setNotifications((prev) => prev.map((n) => ({...n, isRead: true })));

    const chunks = [];
    for (let i = 0; i < unreadIds.length; i += 450) {
      chunks.push(unreadIds.slice(i, i + 450));
    }

    try {
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((id) => batch.update(doc(db, "notifications", id), { isRead: true }));
        await batch.commit();
      }
      toast.success("Đã đánh dấu tất cả đã đọc");
    } catch {
      toast.error("Lỗi");
      window.location.reload();
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

    const chunks = [];
    for (let i = 0; i < toDelete.length; i += 450) chunks.push(toDelete.slice(i, i + 450));

    try {
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((id) => batch.delete(doc(db, "notifications", id)));
        await batch.commit();
      }
      toast.success(`Đã xóa ${toDelete.length} thông báo`);
    } catch {
      toast.error("Lỗi xóa");
    }
  }, [selectedIds]);

  /* ================= AUTO MARK READ ON VIEW ================= */
  const setObserver = useCallback((node: HTMLDivElement | null, id: string, isRead: boolean) => {
    if (!node || isRead) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const notifId = entry.target.getAttribute("data-id");
            if (notifId) markAsRead(notifId);
          }
        });
      }, { threshold: 0.5 });
    }
    observerRef.current.observe(node);
  }, [markAsRead]);

  const toggleSelect = (id: string) => setSelectedIds((prev) => prev.includes(id)? prev.filter((i) => i!== id) : [...prev, id]);

  const formatTime = (time: Timestamp | null) => {
    if (!time) return "";
    try {
      return formatDistanceToNow(time.toDate(), { addSuffix: true, locale: vi });
    } catch {
      return "";
    }
  };

  const getIcon = (type: Notification["type"]) => ({ like: "❤️", comment: "💬", friend_request: "👥", task_apply: "📋", system: "🔔" }[type] || "🔔");

  const handleClickNotif = useCallback((n: Notification) => {
    if (!n.isRead) markAsRead(n.id);
    if (n.link) {
      if (n.link.startsWith("/")) router.push(n.link);
      else window.open(n.link, "_blank");
    }
  }, [markAsRead, router]);

  if (loading) return <Skeleton />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <Toaster richColors position="top-center" />
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl text-gray-900 dark:text-gray-100">Thông báo</h1>
            {unreadCount > 0 && <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{unreadCount} chưa đọc</p>}
          </div>
          {selectedIds.length > 0? (
            <div className="flex gap-2">
              <button onClick={deleteSelected} className="p-2 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-xl active:scale-90" aria-label="Xóa đã chọn">
                <FiTrash2 size={20} />
              </button>
              <button onClick={() => setSelectedIds([])} className="px-3 py-2 text-sm font-semibold text-gray-600 dark:text-zinc-400">Hủy</button>
            </div>
          ) : (
            unreadCount > 0 && <button onClick={markAllAsRead} className="text-sm font-semibold text-blue-500 active:scale-95 flex items-center gap-1.5"><FiCheck size={18} />Đọc tất cả</button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-24">
        {notifications.length === 0? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-zinc-500">
            <FiBell size={64} className="mb-4 opacity-50" />
            <p className="font-semibold">Chưa có thông báo</p>
          </div>
        ) : (
          Object.entries(groupedNotifs).map(([date, items]) => {
            if (!items.length) return null;
            return (
              <div key={date}>
                <div className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">{date}</div>
                <div className="space-y-2 px-4">
                  {items.map((n) => (
                    <div
                      key={n.id}
                      data-id={n.id}
                      ref={(node) => setObserver(node, n.id, n.isRead)}
                      className={`bg-white dark:bg-zinc-900 rounded-3xl p-4 border transition-all ${selectedIds.includes(n.id)? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-100 dark:border-zinc-800"} ${!n.isRead? "shadow-sm shadow-blue-100/50 dark:shadow-blue-900/20" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <button onClick={() => toggleSelect(n.id)} className="mt-1" aria-label="Chọn">
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.includes(n.id)? "bg-blue-500 border-blue-500" : "border-gray-300 dark:border-zinc-600"}`}>
                            {selectedIds.includes(n.id) && <FiCheck size={14} className="text-white" />}
                          </div>
                        </button>
                        <div className="relative">
                          <img src={n.fromUserAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(n.fromUserName)}`} className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-50 dark:ring-zinc-800" />
                          <div className="absolute -bottom-1 -right-1 text-lg">{getIcon(n.type)}</div>
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleClickNotif(n)}>
                          <p className="text-sm text-gray-900 dark:text-gray-100"><span className="font-semibold">{n.fromUserName}</span> {n.content}</p>
                          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{formatTime(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-2 shrink-0" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
        {lastDoc && (
          <button onClick={loadMore} disabled={loadingMore} className="w-full py-3 text-sm text-blue-500 font-semibold disabled:opacity-50">
            {loadingMore? "Đang tải..." : "Tải thêm"}
          </button>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="bg-white dark:bg-zinc-900 px-4 py-4 border-b border-gray-100 dark:border-zinc-800">
        <div className="h-6 w-32 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl animate-pulse">
            <div className="flex gap-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
