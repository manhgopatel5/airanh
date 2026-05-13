"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiRefreshCw, FiX } from "react-icons/fi";
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
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

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

  const emptyLottie = "/lotties/huha-task-full.lottie";
  const loadingLottie = "/lotties/huha-loading-pull-full.lottie";

  const theme = {
    task: {
      primary: "#0042B2",
      gradient: "from-[#0042B2] to-[#1A5FFF]",
      light: "bg-[#E8F1FF]",
      text: "text-[#0042B2]",
      shadow: "shadow-[0_8px_28px_rgba(0,66,178,0.35)]",
    },
    plan: {
      primary: "#00C853",
      gradient: "from-[#00C853] to-[#00E676]",
      light: "bg-[#E8F5E9]",
      text: "text-[#00C853]",
      shadow: "shadow-[0_8px_28px_rgba(0,200,83,0.35)]",
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
            where("type", "==", "task"),
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
  }, [currentUser, mode, subTab, searchQuery, db]);

  const fetchTasksRef2 = useRef(fetchTasks);
  fetchTasksRef2.current = fetchTasks;

  useEffect(() => {
    if (currentUser) fetchTasksRef2.current(true);
  }, [currentUser, mode, subTab]);

  const fetchTasksRef = useRef(fetchTasks);
  fetchTasksRef.current = fetchTasks;

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore &&!loading &&!loadingMore) {
          fetchTasksRef.current(false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

const handleRefresh = async () => {
  if (refreshing) return;

  setRefreshing(true);

  try {
    await fetchTasks(true);
    navigator.vibrate?.(10);
  } finally {
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }
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
        className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 select-none pb-28"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {pullDistance > 0 && (
          <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl"
            style={{ height: `${pullDistance}px`, transition: pullDistance === 0? 'height 0.3s' : 'none' }}
          >
            <div className="w-6 h-6">
              <DotLottieReact src={loadingLottie} autoplay loop style={{width:24,height:24}} />
            </div>
          </div>
        )}

        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900">
              <button
                onClick={() => handleModeChange("task")}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  mode === "task"
               ? `bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-sm`
                    : "text-zinc-500"
                }`}
              >
                <HiBolt className="w-4 h-4" />
                Task
              </button>
              <button
                onClick={() => handleModeChange("plan")}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  mode === "plan"
               ? `bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-sm`
                    : "text-zinc-500"
                }`}
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
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {tab.label}
                  </motion.button>
                ))}
              </div>
              <div className="flex items-center gap-2">
  <button
    onClick={() => {
      vibrate();
      setShowSearch(!showSearch);
    }}
    className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 active:scale-90 transition-all"
  >
    <FiSearch
      size={18}
      className="text-zinc-600 dark:text-zinc-400"
    />
  </button>

  <motion.button
    whileTap={{ scale: 0.92 }}
    onClick={handleRefresh}
    disabled={refreshing}
    className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 active:scale-90 transition-all disabled:opacity-50"
  >
    <FiRefreshCw
      size={18}
      className={`text-zinc-600 dark:text-zinc-400 ${
        refreshing ? "animate-spin" : ""
      }`}
    />
  </motion.button>
</div>
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
                      className="w-full px-4 py-3 pr-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900 outline-none text-sm focus:ring-2 focus:ring-[#0042B2]/30"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800"
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

        <div className="max-w- mx-auto p-4">
          {loading? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 p-4">
                  <div className="flex gap-3 animate-pulse">
                    <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-900 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-900 rounded-lg" />
                      <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-900 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTasks.length === 0? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 p-12 text-center"
            >
              <div className="w-24 h-24 mx-auto mb-4">
                <DotLottieReact src={emptyLottie} autoplay loop style={{width:96,height:96}} />
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
                  className={`px-6 h-12 rounded-2xl bg-gradient-to-r ${currentTheme.gradient} text-white text-sm font-bold active:scale-95 transition-all ${currentTheme.shadow}`}
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
                    transition={{ delay: idx * 0.04 }}
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
              <div className="w-8 h-8">
                <DotLottieReact src={loadingLottie} autoplay loop style={{width:32,height:32}} />
              </div>
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
