"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FiAlertCircle, FiBookmark, FiInbox, FiPlus, FiRefreshCw, FiSearch } from "react-icons/fi";
import { HiBolt, HiCalendarDays, HiSparkles } from "react-icons/hi2";
import { useRouter } from "next/navigation";
import ShareTaskModal from "@/components/ShareTaskModal";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import useSWR from "swr";
import type { FeedTask } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";
import { toast } from "sonner";
import { useAppStore } from "@/store/app";

type SubTab = "mine" | "saved" | "doing" | "applied" | "expired" | "completed" | "cancelled";

const SUB_TABS: { key: SubTab; label: string; short: string }[] = [
  { key: "mine", label: "Của tôi", short: "Tạo" },
  { key: "saved", label: "Đã lưu", short: "Lưu" },
  { key: "doing", label: "Đang nhận", short: "Nhận" },
  { key: "applied", label: "Đã ứng tuyển", short: "Ứng tuyển" },
  { key: "completed", label: "Hoàn thành", short: "Xong" },
  { key: "expired", label: "Đã hết hạn", short: "Hết hạn" },
  { key: "cancelled", label: "Đã hủy", short: "Hủy" },
];

const EMPTY_COPY: Record<SubTab, { title: string; body: string }> = {
  mine: { title: "Chưa có mục nào", body: "Tạo việc hoặc kế hoạch đầu tiên để bắt đầu quản lý mọi thứ tại một nơi." },
  saved: { title: "Chưa lưu mục nào", body: "Các task và plan bạn đánh dấu sẽ nằm ở đây để quay lại nhanh." },
  doing: { title: "Chưa nhận task nào", body: "Khi bạn nhận việc, tiến độ và thông tin liên quan sẽ xuất hiện tại đây." },
  applied: { title: "Chưa ứng tuyển", body: "Ứng tuyển các task phù hợp để theo dõi phản hồi của chủ task." },
  completed: { title: "Chưa hoàn thành", body: "Những việc đã xong sẽ được lưu lại như một lịch sử gọn gàng." },
  expired: { title: "Không có mục hết hạn", body: "Các task quá hạn gần đây sẽ được gom ở đây để bạn xử lý nhanh." },
  cancelled: { title: "Không có mục đã hủy", body: "Những mục bị hủy sẽ được tách riêng để danh sách chính luôn sạch." },
};

const MODE_THEME = {
  task: {
    label: "Task",
    noun: "task",
    primary: "#0A84FF",
    gradient: "from-[#0A84FF] to-[#0066CC]",
    soft: "from-[#EAF4FF] via-white to-[#F7FBFF] dark:from-[#071B33] dark:via-zinc-950 dark:to-zinc-950",
    ring: "ring-[#0A84FF]/20",
    shadow: "shadow-[0_14px_40px_rgba(10,132,255,0.24)]",
  },
  plan: {
    label: "Plan",
    noun: "plan",
    primary: "#30D158",
    gradient: "from-[#30D158] to-[#248A3D]",
    soft: "from-[#EBFFF1] via-white to-[#F8FFFA] dark:from-[#082414] dark:via-zinc-950 dark:to-zinc-950",
    ring: "ring-[#30D158]/20",
    shadow: "shadow-[0_14px_40px_rgba(48,209,88,0.22)]",
  },
} as const;

class UserTasksFetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UserTasksFetchError";
    this.status = status;
  }
}

const fetchUserTasks = async (url: string, token: string) => {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) return res.json();

  const body = await res.json().catch(() => null);
  throw new UserTasksFetchError(body?.error || "Tải dữ liệu thất bại", res.status);
};

const fetcher = async ([url, token]: [string, string]) => {
  if (!token) throw new UserTasksFetchError("Chưa đăng nhập", 401);

  try {
    return await fetchUserTasks(url, token);
  } catch (err) {
    if (err instanceof UserTasksFetchError && err.status === 401) {
      const freshToken = await getFirebaseAuth().currentUser?.getIdToken(true);
      if (freshToken && freshToken !== token) {
        return fetchUserTasks(url, freshToken);
      }
    }

    throw err;
  }
};

const vibrate = (ms: number | number[] = 8) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
};

export default function TasksPage() {
  const auth = getFirebaseAuth();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { mode = "task", setMode } = useAppStore();
  const [subTab, setSubTab] = useState<SubTab>("mine");
  const [shareTask, setShareTask] = useState<FeedTask | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const currentTheme = MODE_THEME[mode] || MODE_THEME.task;
  const activeCopy = EMPTY_COPY[subTab];
  const activeTabLabel = SUB_TABS.find((tab) => tab.key === subTab)?.label || "Của tôi";

  const swrKey = token ? [`/api/user-tasks?type=${mode}&tab=${subTab}`, token] as const : null;
  const { data: tasks = [], error, isLoading, isValidating, mutate } = useSWR<FeedTask[]>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      dedupingInterval: 30000,
      keepPreviousData: true,
      refreshInterval: 0,
      shouldRetryOnError: false,
      onError: (err) => {
        console.error(err);
        toast.error(err?.message || "Tải dữ liệu thất bại", { id: "user-tasks-load-error" });
      },
    }
  );

  const loading = !authReady || (isLoading && tasks.length === 0);
  const refreshing = authReady && isValidating && !loading;
  const hasBlockingError = !!error && tasks.length === 0 && !loading;

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthReady(true);

      if (!user) {
        setToken(null);
        router.push("/login");
        return;
      }

      const nextToken = await user.getIdToken();
      setToken(nextToken);
    });

    return () => unsub();
  }, [auth, router]);

  const handleTabChange = (newTab: SubTab) => {
    if (newTab === subTab) return;
    vibrate(8);
    setSubTab(newTab);
  };

  const handleModeChange = (newMode: "task" | "plan") => {
    if (newMode === mode) return;
    vibrate([10, 20, 10]);
    setMode(newMode);
  };

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<FeedTask>) => {
    mutate(
      (current: FeedTask[] = []) =>
        current.map(t => t.id === taskId ? ({ ...t, ...updates } as FeedTask) : t),
      { revalidate: false }
    );
  }, [mutate]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const freshToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${freshToken}` },
      });

      if (!res.ok) throw new Error("Xóa thất bại");

      mutate(
        (current: FeedTask[] = []) => current.filter(t => t.id !== id),
        { revalidate: false }
      );
      toast.success("Đã xóa");
    } catch {
      toast.error("Xóa thất bại");
    }
  }, [mutate, auth]);

  const handleShare = useCallback((task: FeedTask) => {
    vibrate(5);
    setShareTask(task);
  }, []);

  const retryLoad = useCallback(() => {
    vibrate(8);
    mutate();
  }, [mutate]);

  const createCurrentMode = useCallback(() => {
    vibrate(10);
    router.push(mode === "task" ? "/create/task" : "/create/plan");
  }, [mode, router]);

  const enterMotion = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };

  return (
    <>
      <div className={`min-h-screen bg-gradient-to-b ${currentTheme.soft} text-zinc-900 dark:text-zinc-100`}>
        <div className="sticky top-0 z-40 border-b border-white/70 bg-white/82 backdrop-blur-2xl dark:border-white/5 dark:bg-zinc-950/82">
          <div className="mx-auto max-w-[600px] px-4 pt-3 pb-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-black tracking-tight text-zinc-950 dark:text-white">Quản lý</h1>
                <p className="text-xs font-semibold text-zinc-500">
                  {filteredTasks.length} {currentTheme.noun}
                  {searchQuery ? " khớp" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/bookmarks")}
                  className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-300"
                  aria-label="Đã lưu"
                >
                  <FiBookmark size={18} />
                </button>
                <button
                  type="button"
                  onClick={createCurrentMode}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r ${currentTheme.gradient} px-4 text-sm font-bold text-white shadow-lg ${currentTheme.shadow}`}
                >
                  <FiPlus size={16} />
                  Tạo
                </button>
              </div>
            </div>

            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Tìm trong ${currentTheme.noun} của bạn…`}
                className="w-full h-11 pl-9 pr-4 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900/90 text-sm font-medium outline-none ring-1 ring-black/[0.04] dark:ring-white/10"
              />
            </div>

            <div className="relative rounded-[1.35rem] bg-zinc-100/80 p-1.5 ring-1 ring-black/5 dark:bg-zinc-900/90 dark:ring-white/10">
              <motion.div
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-[1rem] bg-gradient-to-r ${currentTheme.gradient} ${currentTheme.shadow}`}
                animate={{ x: mode === "task" ? 0 : "100%" }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 34 }}
              />

              <div className="relative grid grid-cols-2 gap-1">
                <button
                  type="button"
                  aria-pressed={mode === "task"}
                  onClick={() => handleModeChange("task")}
                  className={`flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-colors ${mode === "task" ? "text-white" : "text-zinc-500 dark:text-zinc-400"}`}
                >
                  <HiBolt className="h-4 w-4" />
                  Task
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "plan"}
                  onClick={() => handleModeChange("plan")}
                  className={`flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-colors ${mode === "plan" ? "text-white" : "text-zinc-500 dark:text-zinc-400"}`}
                >
                  <HiCalendarDays className="h-4 w-4" />
                  Plan
                </button>
              </div>
            </div>

            <div className="relative mt-3">
              <div className="flex snap-x gap-2 overflow-x-auto pb-1 pr-8 scrollbar-hide" role="tablist" aria-label="Bộ lọc task của tôi">
                {SUB_TABS.map((tab) => {
                  const active = subTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-current={active ? "page" : undefined}
                      onClick={() => handleTabChange(tab.key)}
                      className={`snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${active
                        ? `bg-gradient-to-r ${currentTheme.gradient} text-white shadow-lg ${currentTheme.shadow}`
                        : "bg-white/82 text-zinc-600 ring-1 ring-black/5 active:bg-zinc-100 dark:bg-zinc-900/82 dark:text-zinc-400 dark:ring-white/10"
                      }`}
                    >
                      <span className="sm:hidden">{tab.short}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80" />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[600px] px-4 pt-4">
          {loading ? (
            <div className="space-y-3" aria-label="Đang tải danh sách">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-[1.5rem] border border-white/70 bg-white/78 p-4 shadow-lg shadow-black/[0.03] ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70 dark:ring-white/10">
                  <div className="flex gap-3 motion-safe:animate-pulse">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                      <div className="h-3 w-1/2 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                      <div className="h-10 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800/70" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : hasBlockingError ? (
            <motion.div
              {...enterMotion}
              transition={{ duration: 0.24 }}
              className="rounded-[1.75rem] border border-red-200/70 bg-white/82 p-8 text-center shadow-xl shadow-red-500/5 ring-1 ring-red-500/10 backdrop-blur-xl dark:border-red-500/20 dark:bg-zinc-900/74"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 ring-1 ring-red-500/10 dark:bg-red-500/10">
                <FiAlertCircle className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-lg font-black text-zinc-950 dark:text-white">Chưa tải được dữ liệu</h2>
              <p className="mx-auto mt-2 max-w-[320px] text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Phiên đăng nhập hoặc kết nối có thể vừa hết hạn. Thử lại để làm mới token và tải danh sách.
              </p>
              <button
                type="button"
                onClick={retryLoad}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white active:scale-95 dark:bg-white dark:text-zinc-950"
              >
                <FiRefreshCw className="h-4 w-4" />
                Thử lại
              </button>
            </motion.div>
          ) : tasks.length === 0 ? (
            <motion.div
              {...enterMotion}
              transition={{ duration: 0.28 }}
              className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/82 p-8 text-left shadow-2xl shadow-black/[0.05] ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/72 dark:ring-white/10"
            >
              <div className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${currentTheme.gradient} opacity-15 blur-2xl`} />
              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-400 ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10">
                    <FiInbox className="h-7 w-7" />
                  </div>
                  <div className={`rounded-full bg-gradient-to-r ${currentTheme.gradient} px-3 py-1 text-xs font-black text-white shadow-lg ${currentTheme.shadow}`}>
                    {activeTabLabel}
                  </div>
                </div>

                <h2 className="mt-6 text-2xl font-black tracking-tight text-zinc-950 dark:text-white">{activeCopy.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{activeCopy.body}</p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {subTab === "mine" && (
                    <button
                      type="button"
                      onClick={createCurrentMode}
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${currentTheme.gradient} px-5 text-sm font-bold text-white active:scale-95 ${currentTheme.shadow}`}
                    >
                      <HiSparkles className="h-4 w-4" />
                      Tạo {currentTheme.noun}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={retryLoad}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-100 px-5 text-sm font-bold text-zinc-700 active:scale-95 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                    Tải lại
                  </button>
                </div>
              </div>
            </motion.div>
          ) : filteredTasks.length === 0 ? (
            <motion.div
              {...enterMotion}
              transition={{ duration: 0.24 }}
              className="rounded-[1.75rem] border border-zinc-200/70 bg-white/82 p-8 text-center dark:border-white/10 dark:bg-zinc-900/72"
            >
              <p className="text-lg font-black text-zinc-950 dark:text-white">Không tìm thấy kết quả</p>
              <p className="mt-2 text-sm text-zinc-500">Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm</p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-4 h-11 px-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-sm font-bold"
              >
                Xóa tìm kiếm
              </button>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`${mode}-${subTab}`}
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                {...(prefersReducedMotion ? {} : { exit: { opacity: 0 } })}
                className="space-y-3"
              >
                {filteredTasks.map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: prefersReducedMotion ? 0 : Math.min(idx * 0.025, 0.18) }}
                    layout={!prefersReducedMotion}
                  >
                    <TaskCard
                      task={task}
                      theme={mode}
                      currentUserId={currentUserId}
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
            <div className="flex justify-center py-6" aria-live="polite">
              <FiRefreshCw className="motion-safe:animate-spin text-zinc-400" size={22} />
            </div>
          )}

          {shareTask && (
            <ShareTaskModal
              task={shareTask}
              onClose={() => setShareTask(null)}
            />
          )}

          <div className="h-6" />
        </div>
      </div>

      <style jsx global>{`
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
