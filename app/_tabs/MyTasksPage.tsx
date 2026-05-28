"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiInbox, FiRefreshCw } from "react-icons/fi";
import { HiBolt, HiCalendarDays } from "react-icons/hi2";
import { useRouter } from "next/navigation";
import ShareTaskModal from "@/components/ShareTaskModal";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import useSWR, { mutate } from "swr";
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

const fetcher = (url: string) => fetch(url).then(r => r.json());

const vibrate = (ms = 8) => {
  if ("vibrate" in navigator) navigator.vibrate(ms);
};

export default function TasksPage() {
  const auth = getFirebaseAuth();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { mode = "task", setMode } = useAppStore();
  const [subTab, setSubTab] = useState<SubTab>("mine");
  const [shareTask, setShareTask] = useState<FeedTask | null>(null);

  // FIX: Dùng SWR thay getDocs. 0 reads nếu cache còn
  const { data: tasks = [], isLoading, isValidating, mutate: refetch } = useSWR<FeedTask[]>(
    currentUser? `/api/user-tasks?type=${mode}&tab=${subTab}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 phút mới gọi API 1 lần
      keepPreviousData: true, // Chuyển tab mượt
    }
  );

  const loading = isLoading && tasks.length === 0;
  const refreshing = isValidating;

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) router.push("/login");
    });
    return () => unsub();
  }, [auth, router]);

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
    mutate(
      `/api/user-tasks?type=${mode}&tab=${subTab}`,
      (current: FeedTask[] = []) =>
        current.map(t => t.id === taskId? ({...t,...updates } as FeedTask) : t),
      false
    );
  }, [mode, subTab]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Xóa task này?")) return;
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      mutate(
        `/api/user-tasks?type=${mode}&tab=${subTab}`,
        (current: FeedTask[] = []) => current.filter(t => t.id!== id),
        false
      );
      toast.success("Đã xóa");
    } catch {
      toast.error("Xóa thất bại");
    }
  }, [mode, subTab]);

  const handleShare = useCallback((task: FeedTask) => {
    vibrate(5);
    setShareTask(task);
  }, []);

  const handleRefresh = useCallback(() => {
    vibrate(10);
    refetch();
  }, [refetch]);

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
                    transition={{ delay: idx * 0.03 }}
                    layout
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

          <div className="h-4" />
        </div>
      </div>

      <style jsx global>{`
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}