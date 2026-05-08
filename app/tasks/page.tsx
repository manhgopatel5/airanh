"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiInbox, FiSearch, FiRefreshCw, FiX } from "react-icons/fi";
import { HiBolt, HiCalendarDays } from "react-icons/hi2";
import { useRouter } from "next/navigation";
import ShareTaskModal from "@/components/ShareTaskModal";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import type { Task } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";
import { toast, Toaster } from "sonner";
import { useAppStore } from "@/store/app";

type SubTab = "mine" | "saved" | "doing" | "applied" | "expired" | "completed" | "cancelled";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "mine", label: "Của tôi" },
  { key: "saved", label: "Đã lưu" },
  { key: "doing", label: "Đang nhận" },
  { key: "applied", label: "Đã ứng tuyển" },
  { key: "completed", label: "Hoàn thành" },
  { key: "expired", label: "Đã hết hạn" },
  { key: "cancelled", label: "Đã hủy" },
];

const PAGE_SIZE = 10;

export default function TasksPage() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { mode = "task", setMode } = useAppStore();
  const [subTab, setSubTab] = useState<SubTab>("mine");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [shareTask, setShareTask] = useState<Task | null>(null);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  const theme = {
    task: {
      primary: "#0A84FF",
      gradient: "from-[#0A84FF] to-[#0066CC]",
      light: "bg-[#E8F0FE]",
      text: "text-[#0A84FF]",
      shadow: "shadow-[0_8px_30px_rgba(10,132,255,0.3)]",
    },
    plan: {
      primary: "#30D158",
      gradient: "from-[#30D158] to-[#28B44C]",
      light: "bg-[#E8F5E9]",
      text: "text-[#30D158]",
      shadow: "shadow-[0_8px_30px_rgba(48,209,88,0.3)]",
    }
  };

  const vibrate = (ms = 8) => {
    if ("vibrate" in navigator) navigator.vibrate(ms);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) router.push("/login");
    });
    return () => unsub();
  }, []);

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (!currentUser) {
      setLoading(false);
      setTasks([]);
      return;
    }
    if (isRefresh) {
      setRefreshing(true);
      setTasks([]);
      setLastDoc(null);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const baseCollection = collection(db, "tasks");
      let q = query(
        baseCollection,
        where("type", "==", mode),
        limit(PAGE_SIZE)
      );

      switch (subTab) {
        case "mine":
          q = query(baseCollection, where("userId", "==", currentUser.uid), where("type", "==", mode), limit(PAGE_SIZE));
          break;
  case "expired":
  const now = Timestamp.now();
  const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  q = query(
    baseCollection, 
    where("userId", "==", currentUser.uid), 
    where("type", "==", "task"), // ép chỉ lấy task
    where("deadline", "<", now),
    where("deadline", ">", sevenDaysAgo),
    orderBy("deadline", "desc"),
    limit(PAGE_SIZE)
  );
  
    break;
        case "saved":
          q = query(baseCollection, where("savedBy", "array-contains", currentUser.uid), where("type", "==", mode), limit(PAGE_SIZE));
          break;
        case "doing":
          q = query(baseCollection, where("assignees", "array-contains", currentUser.uid), where("type", "==", mode), limit(PAGE_SIZE));
          break;
        case "applied":
          q = query(baseCollection, where("applicants", "array-contains", currentUser.uid), where("type", "==", mode), limit(PAGE_SIZE));
          break;
        case "completed":
          q = query(baseCollection, where("assignees", "array-contains", currentUser.uid), where("type", "==", mode), limit(PAGE_SIZE));
          break;
        case "cancelled":
          q = query(baseCollection, where("userId", "==", currentUser.uid), where("type", "==", mode), limit(PAGE_SIZE));
          break;
      }

      if (lastDoc &&!isRefresh) {
        q = query(q, startAfter(lastDoc));
      }

      const snap = await getDocs(q);
      console.log("Firestore docs:", snap.docs.length);

      let data = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title || "Không có tiêu đề",
          type: d.type || mode,
          status: d.status || "open",
        ...d
        } as Task;
      })
    .filter(t => t.id && t.title);

      console.log("After filter:", data.length);

      switch (subTab) {
        case "mine":
          data = data.filter(t =>!["deleted", "cancelled"].includes(t.status));
          break;
case "expired":
data = data.filter(t => t.type === "task" && t.deadline && t.deadline.seconds * 1000 < Date.now());
  break;
  case "saved":
    data = data.filter(t =>!["deleted", "cancelled"].includes(t.status));
    break;
  
        case "doing":
          data = data.filter(t => t.status === "doing");
          break;
        case "applied":
          data = data.filter(t => ["open", "pending"].includes(t.status));
          break;
        case "completed":
          data = data.filter(t => t.status === "completed");
          break;
        case "cancelled":
          data = data.filter(t => t.status === "cancelled");
          break;
      }

      if (searchQuery) {
        data = data.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
      }

      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      if (isRefresh) {
        setTasks(data);
      } else {
        setTasks(prev => [...prev,...data]);
      }

      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err: any) {
      console.error(err);
      toast.error("Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [currentUser, mode, subTab, searchQuery, db]); // ← Đã bỏ lastDoc

  useEffect(() => {
    if (currentUser) fetchTasks(true);
  }, [currentUser, mode, subTab]);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore &&!loading &&!loadingMore) {
          fetchTasks(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchTasks]);

  const handleRefresh = async () => {
    vibrate(10);
    await fetchTasks(true);
  };

  const handleTabChange = (newTab: SubTab) => {
    vibrate();
    setSubTab(newTab);
  };

  const handleModeChange = (newMode: "task" | "plan") => {
    vibrate();
    setMode(newMode);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0]?.clientY?? 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current > 0 && window.scrollY === 0) {
      const touchY = e.touches[0]?.clientY;
      if (!touchY) return;
      const distance = touchY - pullStartY.current;
      if (distance > 0) {
        setPullDistance(Math.min(distance, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      handleRefresh();
    }
    pullStartY.current = 0;
    setPullDistance(0);
  };

  const filteredTasks = tasks.filter(t =>
   !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentTheme = theme[mode] || theme.task;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div
        className="min-h-screen bg-[#F2F2F7] dark:bg-black text-zinc-900 dark:text-zinc-100 select-none pb-28"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {pullDistance > 0 && (
          <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl"
            style={{ height: `${pullDistance}px`, transition: pullDistance === 0? 'height 0.3s' : 'none' }}
          >
            <FiRefreshCw
              className={`${pullDistance > 60? 'animate-spin' : ''} text-[#0A84FF]`}
              size={20}
            />
          </div>
        )}

        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">

          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <button
                onClick={() => handleModeChange("task")}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  mode === "task"
                ? `bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm`
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <HiBolt className="w-4 h-4" />
                Task
              </button>

              <button
                onClick={() => handleModeChange("plan")}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  mode === "plan"
                ? `bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm`
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <HiCalendarDays className="w-4 h-4" />
                Plan
              </button>
            </div>
          </div>

          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
                {SUB_TABS.map((tab) => (
                  <motion.button
                    key={tab.key}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTabChange(tab.key)}
                    className={`px-4 h-9 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                      subTab === tab.key
                    ? `bg-gradient-to-r ${currentTheme.gradient} text-white ${currentTheme.shadow}`
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {tab.label}
                  </motion.button>
                ))}
              </div>
              <button
                onClick={() => {
                  vibrate();
                  setShowSearch(!showSearch);
                }}
                className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 active:scale-90 transition-all"
              >
                <FiSearch size={18} className="text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>

            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Tìm ${mode}...`}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none text-sm focus:ring-2 focus:ring-[#0A84FF]/20"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <FiX size={16} className="text-zinc-500" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="max-w-[600px] mx-auto p-4">
          {loading? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 p-4">
                  <div className="flex gap-3 animate-pulse">
                    <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                      <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTasks.length === 0? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 p-12 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <FiInbox size={32} className="text-zinc-400" />
              </div>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                Chưa có {mode === "task"? "task" : "plan"} nào
              </p>
              <p className="text-sm text-zinc-500 mb-6">
                {subTab === "mine" && `Tạo ${mode} đầu tiên của bạn`}
                {subTab === "saved" && `Lưu ${mode} để xem sau`}
                {subTab === "doing" && `Nhận ${mode} để bắt đầu làm`}
                {subTab === "applied" && `Ứng tuyển ${mode} phù hợp`}
                {subTab === "completed" && `Hoàn thành ${mode} đầu tiên`}
                {subTab === "cancelled" && `Không có ${mode} nào bị hủy`}
              </p>
              {subTab === "mine" && (
                <button
                  onClick={() => {
                    vibrate(10);
                    router.push(mode === "task"? "/create/task" : "/create/plan");
                  }}
                  className={`px-6 h-11 rounded-xl bg-gradient-to-r ${currentTheme.gradient} text-white text-sm font-semibold active:scale-95 transition-all ${currentTheme.shadow}`}
                >
                  Tạo ngay
                </button>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`${mode}-${subTab}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredTasks.map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <TaskCard
                      task={task}
                      theme={mode}
                      onDelete={(id) => setTasks(prev => prev.filter(t => t.id!== id))}
                      onShare={(t) => setShareTask(t)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {loadingMore && (
            <div className="flex justify-center py-6">
              <FiRefreshCw className="animate-spin text-zinc-400" size={24} />
            </div>
          )}

          {refreshing && (
            <div className="flex justify-center py-6">
              <FiRefreshCw className="animate-spin text-[#0A84FF]" size={24} />
            </div>
          )}

          {shareTask && (
            <ShareTaskModal
              task={shareTask}
              onClose={() => setShareTask(null)}
            />
          )}

          <div ref={loadMoreRef} className="h-4" />
        </div>
      </div>

      <style jsx global>{`
       .scrollbar-hide::-webkit-scrollbar { display: none; }
       .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}