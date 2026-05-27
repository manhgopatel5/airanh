"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiInbox, FiRefreshCw } from "react-icons/fi";
import { HiBolt, HiCalendarDays } from "react-icons/hi2";
import { useRouter } from "next/navigation";
import ShareTaskModal from "@/components/ShareTaskModal";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
  doc,
  deleteDoc
} from "firebase/firestore";
import type { FeedTask } from "@/types/task";
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
  const [tasks, setTasks] = useState<FeedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [shareTask, setShareTask] = useState<FeedTask | null>(null);

  // FIX 1: Tách lastDoc theo tab để pagination đúng
  const lastDocRef = useRef<Record<string, QueryDocumentSnapshot<DocumentData> | null>>({});
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const theme = {
    task: {
      primary: "#0A84FF",
      gradient: "from-[#0A84FF] to-[#0066CC]",
      shadow: "shadow-[0_8px_30px_rgba(10,132,255,0.3)]",
    },
    plan: {
      primary: "#30D158",
      gradient: "from-[#30D158] to-[#28B44C]",
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
  }, [auth, router]);

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (!currentUser) {
      setLoading(false);
      setTasks([]);
      return;
    }

    const tabKey = `${mode}-${subTab}`;

    if (isRefresh) {
      setRefreshing(true);
      setTasks([]);
      lastDocRef.current = {};
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const baseCollection = collection(db, "tasks");
      const lastDoc = lastDocRef.current[tabKey];

      // FIX 2: Query đơn giản, không orderBy phức tạp -> không cần index
      const baseConstraints = [where("type", "==", mode), limit(PAGE_SIZE)];
      let q;

      switch (subTab) {
        case "mine":
          q = query(baseCollection, where("userId", "==", currentUser.uid),...baseConstraints);
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
         ...baseConstraints
          );
          break;
        case "saved":
          q = query(baseCollection, where("savedBy", "array-contains", currentUser.uid),...baseConstraints);
          break;
        case "doing":
          q = query(baseCollection, where("assignees", "array-contains", currentUser.uid), where("status", "==", "doing"),...baseConstraints);
          break;
        case "applied":
          q = query(baseCollection, where("applicants", "array-contains", currentUser.uid), where("status", "in", ["open", "pending"]),...baseConstraints);
          break;
        case "completed":
          q = query(baseCollection, where("assignees", "array-contains", currentUser.uid), where("status", "==", "completed"),...baseConstraints);
          break;
        case "cancelled":
          q = query(baseCollection, where("userId", "==", currentUser.uid), where("status", "==", "cancelled"),...baseConstraints);
          break;
        default:
          q = query(baseCollection,...baseConstraints);
      }

      if (lastDoc &&!isRefresh) {
        q = query(q, startAfter(lastDoc));
      }

      const snap = await getDocs(q);

      const data = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
     ...d,
          createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
          deadline: d.deadline?.toDate?.()?.toISOString() || null,
          eventDate: d.eventDate?.toDate?.()?.toISOString() || null,
          endDate: d.endDate?.toDate?.()?.toISOString() || null,
          startDate: d.startDate?.toDate?.()?.toISOString() || null,
          applicationDeadline: d.applicationDeadline?.toDate?.()?.toISOString() || null,
        } as FeedTask;
      })
  .filter(t => t.id && t.title)
   // FIX 3: Sort ở client thay vì orderBy Firestore -> giảm read + không cần index
  .sort((a, b) => {
      const aTime = a.createdAt? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

      if (isRefresh) {
        setTasks(data);
      } else {
        setTasks(prev => [...prev,...data]);
      }

      lastDocRef.current[tabKey] = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'failed-precondition') {
        toast.error("Cần tạo index Firestore");
        console.error("Index link:", err.message);
      } else {
        toast.error("Tải dữ liệu thất bại");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [currentUser, mode, subTab, db]); // FIX 4: Bỏ lastDoc khỏi deps để tránh loop

  // FIX 5: Chỉ chạy khi currentUser/mode/subTab đổi
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
  }, [hasMore, loading, loadingMore]); // FIX 6: Bỏ fetchTasks khỏi deps

  const handleTabChange = (newTab: SubTab) => {
    vibrate();
    setSubTab(newTab);
  };

  const handleModeChange = (newMode: "task" | "plan") => {
    if (newMode === mode) return;
    vibrate();
    setMode(newMode);
  };

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<FeedTask>) => {
    setTasks(prev => prev.map(t => t.id === taskId? ({...t,...updates } as FeedTask) : t));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Xóa task này?")) return;
    try {
      await deleteDoc(doc(db, "tasks", id));
      setTasks(prev => prev.filter(t => t.id!== id));
      toast.success("Đã xóa");
    } catch {
      toast.error("Xóa thất bại");
    }
  }, [db]);

  const handleShare = useCallback((task: FeedTask) => {
    vibrate(5);
    setShareTask(task);
  }, []);

  const currentTheme = theme[mode] || theme.task;

  return (
    <>
      <Toaster richColors position="top-center" />
<div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none pb-28">

        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
          <div className="px-4 pt-3 pb-2">
         <div className="flex items-center gap-2">
  <button
    onClick={() => handleModeChange("task")}
    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
      mode === "task"
     ? "bg-[#0A84FF] text-white shadow-[0_8px_30px_rgba(10,132,255,0.3)]"
        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
    }`}
  >
    <HiBolt className="w-4 h-4" />
    Task
  </button>

  <button
    onClick={() => handleModeChange("plan")}
    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
      mode === "plan"
     ? "bg-[#30D158] text-white shadow-[0_8px_30px_rgba(48,209,88,0.3)]"
        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
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
        <button
          key={tab.key}
          onClick={() => handleTabChange(tab.key)}
          className={`px-4 h-9 rounded-full text-sm font-semibold whitespace-nowrap ${
            subTab === tab.key
        ? mode === "task"
          ? "bg-[#0A84FF] text-white"
                : "bg-[#30D158] text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 active:bg-zinc-200 dark:active:bg-zinc-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </div>
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
          ) : tasks.length === 0? (
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
                {subTab === "expired" && `Không có ${mode} hết hạn`}
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
                {tasks.map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <TaskCard
                      task={task}
                      theme={mode}
                      onDelete={handleDelete}
                      onShare={handleShare}
                      onTaskUpdate={handleTaskUpdate}
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