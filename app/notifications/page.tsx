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
import {
  FiBell, FiUserPlus, FiAtSign, FiUsers, FiHeart, FiMessageCircle,
  FiInbox, FiTrash2, FiRefreshCw, FiX
} from "react-icons/fi";
import { toast, Toaster } from "sonner";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";

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

type Tab = "all" | "unread";

export default function NotificationsPage() {
  const db = getFirebaseDB();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [swipeId, setSwipeId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const readTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load notifications
  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (!user?.uid) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);

    try {
      const q = query(
        collection(db, "notifications"),
        where("toUserId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(30)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id,...d.data() } as Notification));
      setNotifications(list);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
    } catch (err) {
      console.error(err);
      setError(true);
      toast.error("Không tải được thông báo");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, db]);

  useEffect(() => {
    if (user?.uid) loadNotifications();
  }, [user?.uid, loadNotifications]);

  // Realtime listener for new notifications
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty &&!loading) {
        const newNotif = { id: snap.docs[0].id,...snap.docs[0].data() } as Notification;
        setNotifications((prev) => {
          if (prev.find((n) => n.id === newNotif.id)) return prev;
          return [newNotif,...prev];
        });
      }
    });
    return () => unsub();
  }, [user?.uid, db, loading]);

  // Pull to refresh
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest < -80 &&!refreshing &&!loading) {
      loadNotifications(true);
    }
  });

  const loadMore = useCallback(async () => {
    if (!lastDoc || loadingMore ||!user?.uid) return;
    setLoadingMore(true);
    try {
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
        return;
      }
      const newNotifs = snap.docs.map((d) => ({ id: d.id,...d.data() } as Notification));
      setNotifications((prev) => [...prev,...newNotifs]);
      setLastDoc(snap.docs[snap.docs.length - 1]?? null);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore, user?.uid, db]);

  // Auto mark as read when visible
  const markAsReadTimeout = useCallback((id: string) => {
    if (readTimeouts.current.has(id)) return;
    const timeout = setTimeout(async () => {
      setNotifications((prev) => prev.map((n) => n.id === id? {...n, isRead: true } : n));
      try {
        await updateDoc(doc(db, "notifications", id), { isRead: true });
      } catch {}
      readTimeouts.current.delete(id);
    }, 1000);
    readTimeouts.current.set(id, timeout);
  }, [db]);

  useEffect(() => {
    return () => {
      readTimeouts.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const groupedNotifs = useMemo(() => {
    const filtered = activeTab === "unread"
     ? notifications.filter((n) =>!n.isRead)
      : notifications;

    const groups: { "Hôm nay": Notification[]; "Hôm qua": Notification[]; "Cũ hơn": Notification[] } = {
      "Hôm nay": [],
      "Hôm qua": [],
      "Cũ hơn": [],
    };
    filtered.forEach((n) => {
      const date = n.createdAt?.toDate? n.createdAt.toDate() : new Date(0);
      if (isToday(date)) groups["Hôm nay"].push(n);
      else if (isYesterday(date)) groups["Hôm qua"].push(n);
      else groups["Cũ hơn"].push(n);
    });
    return groups;
  }, [notifications, activeTab]);

  const unreadCount = useMemo(() => notifications.filter((n) =>!n.isRead).length, [notifications]);

  const getIcon = (type: string) => {
    const props = { size: 18 };
    switch (type) {
      case "like": return <FiHeart className="text-[#ff3b30]" {...props} />;
      case "comment": return <FiMessageCircle className="text-[#0a84ff]" {...props} />;
      case "friend_request": return <FiUserPlus className="text-[#0a84ff]" {...props} />;
      case "group_invite": return <FiUsers className="text-[#ff9500]" {...props} />;
      case "mention": return <FiAtSign className="text-[#af52de]" {...props} />;
      case "task_apply": return <FiInbox className="text-[#30d158]" {...props} />;
      default: return <FiBell className="text-zinc-500" {...props} />;
    }
  };

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
  }, [notifications, db]);

  const deleteNotif = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id!== id));
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch {
      toast.error("Lỗi xóa");
    }
  }, [db]);

  const formatTime = (time: Timestamp | null) => {
    if (!time?.toDate) return "";
    try {
      return formatDistanceToNow(time.toDate(), { addSuffix: true, locale: vi });
    } catch {
      return "";
    }
  };

  const handleClickNotif = useCallback((n: Notification) => {
    if (!n.isRead) markAsReadTimeout(n.id);
    if (n.link) {
      if (n.link.startsWith("/")) router.push(n.link);
      else window.open(n.link, "_blank");
    }
  }, [markAsReadTimeout, router]);

  if (authLoading) return <Skeleton />;

  return (
    <div className="min-h-dvh bg-white dark:bg-black">
      <Toaster richColors position="top-center" />

      <div ref={scrollRef} className="h-dvh overflow-y-auto">
        {/* Pull to refresh indicator */}
        {refreshing && (
          <div className="flex justify-center py-4">
            <FiRefreshCw className="animate-spin text-[#0a84ff]" size={20} />
          </div>
        )}

        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[32px] font-bold tracking-tight">Thông báo</h1>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[15px] font-semibold text-[#0a84ff] active:scale-95 transition-transform"
              >
                Đọc tất cả
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            {(["all", "unread"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-[15px] font-semibold transition-all ${
                  activeTab === tab
                   ? "bg-black dark:bg-white text-white dark:text-black"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {tab === "all"? "Tất cả" : `Chưa đọc ${unreadCount > 0? `(${unreadCount})` : ""}`}
              </button>
            ))}
          </div>
        </div>

        {loading? (
          <SkeletonContent />
        ) : error? (
          <ErrorState onRetry={() => loadNotifications(true)} />
        ) : notifications.length === 0? (
          <EmptyState />
        ) : (
          <div className="px-4 pb-24">
            {Object.entries(groupedNotifs).map(([date, items]) => {
              if (!items.length) return null;
              return (
                <div key={date} className="mb-6">
                  <p className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wide mb-2 px-1">
                    {date}
                  </p>
                  <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl overflow-hidden">
                    <AnimatePresence initial={false}>
                      {items.map((n, i) => (
                        <motion.div
                          key={n.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          className="relative group"
                        >
                          <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
                            <button onClick={() => deleteNotif(n.id)} className="text-white">
                              <FiTrash2 size={20} />
                            </button>
                          </div>

                          <motion.div
                            drag="x"
                            dragConstraints={{ left: -80, right: 0 }}
                            dragElastic={0.1}
                            onDragEnd={(_, info) => {
                              if (info.offset.x < -60) {
                                setSwipeId(n.id);
                              } else {
                                setSwipeId(null);
                              }
                            }}
                            animate={{ x: swipeId === n.id? -80 : 0 }}
                            className={`bg-white dark:bg-black relative z-10 ${
                              i!== items.length - 1? "border-b border-zinc-100 dark:border-zinc-900" : ""
                            }`}
                          >
                            <div
                              onViewportEnter={() =>!n.isRead && markAsReadTimeout(n.id)}
                              onClick={() => handleClickNotif(n)}
                              className={`p-3 flex items-start gap-3 active:bg-zinc-50 dark:active:bg-zinc-900 transition-colors ${
                               !n.isRead? "bg-[#0a84ff]/[0.04]" : ""
                              }`}
                            >
                              <div className="relative mt-0.5 flex-shrink-0">
                                <img
                                  src={n.fromUserAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(n.fromUserName)}&background=random`}
                                  className="w-12 h-12 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800"
                                  alt={n.fromUserName}
                                />
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-black rounded-full flex items-center justify-center border-2 border-white dark:border-black">
                                  {getIcon(n.type)}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] leading-[20px]">
                                  <span className="font-semibold">{n.fromUserName}</span>
                                  <span className="text-zinc-600 dark:text-zinc-300"> {n.content}</span>
                                </p>
                                <p className="text-[13px] text-zinc-500 dark:text-zinc-500 mt-0.5">
                                  {formatTime(n.createdAt)}
                                </p>
                              </div>
                              {!n.isRead && (
                                <div className="w-2 h-2 bg-[#0a84ff] rounded-full flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </motion.div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}

            {lastDoc && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 text-[15px] text-[#0a84ff] font-semibold active:scale-95 transition-transform"
              >
                {loadingMore? "Đang tải..." : "Tải thêm"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-dvh bg-white dark:bg-black">
      <div className="px-4 pt-4 pb-2">
        <div className="h-9 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse mb-4" />
        <div className="flex gap-2 mb-3">
          <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
          <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
        </div>
      </div>
      <SkeletonContent />
    </div>
  );
}

function SkeletonContent() {
  return (
    <div className="px-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl animate-pulse">
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
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
      <div className="w-[72px] h-[72px] bg-zinc-100 dark:bg-zinc-900 rounded-[20px] flex items-center justify-center mb-4">
        <FiBell className="text-zinc-400" size={30} strokeWidth={1.5} />
      </div>
      <h3 className="text-[20px] font-semibold mb-1.5">Chưa có thông báo</h3>
      <p className="text-[15px] text-zinc-500 dark:text-zinc-500 max-w-[280px] leading-[20px]">
        Thông báo về lời mời kết bạn, nhóm và tin nhắn sẽ hiện ở đây
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
      <div className="w-[72px] h-[72px] bg-red-50 dark:bg-red-950/20 rounded-[20px] flex items-center justify-center mb-4">
        <FiX className="text-red-500" size={30} strokeWidth={2} />
      </div>
      <h3 className="text-[20px] font-semibold mb-1.5">Không tải được thông báo</h3>
      <p className="text-[15px] text-zinc-500 dark:text-zinc-500 mb-4">Vui lòng thử lại</p>
      <button
        onClick={onRetry}
        className="px-6 py-2.5 bg-[#0a84ff] text-white rounded-full text-[15px] font-semibold active:scale-95 transition-transform"
      >
        Thử lại
      </button>
    </div>
  );
}