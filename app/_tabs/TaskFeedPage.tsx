"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import useSWR from "swr";
import { FiInbox, FiRefreshCw, FiSearch } from "react-icons/fi";
import { HiBolt, HiCalendarDays } from "react-icons/hi2";
import { toast } from "sonner";
import ShareTaskModal from "@/components/ShareTaskModal";
import CustomFilterBar from "@/components/common/CustomFilterBar";
import TaskCard from "@/components/task/TaskCard";
import { useAppStore } from "@/store/app";
import type { FeedTask } from "@/types/task";
import { isActiveFeedItem } from "@/types/task";

type SortBy = "new" | "views" | "price_asc" | "price_desc";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Không tải được feed");
  return res.json();
};

const vibrate = (pattern: number | number[] = 6) => {
  if (typeof navigator!== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
};

type TaskFeedPageProps = {
  initialJobs: FeedTask[]
  initialPlans: FeedTask[]
}

export default function TaskFeedPage({ initialJobs, initialPlans }: TaskFeedPageProps) {
  const reduceMotion = useReducedMotion();
  const { mode = "task", setMode } = useAppStore();

  const [shareTask, setShareTask] = useState<FeedTask | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    category: undefined as string | undefined,
    priceRange: 'all',
    deadlineRange: 'all',
    sortBy: 'new' as SortBy,
    query: '',
  });

  const isTaskMode = mode === "task";
  const accent = isTaskMode? "#0A84FF" : "#30D158";
  const gradient = isTaskMode? "from-[#0A84FF] to-[#0051D5]" : "from-[#30D158] to-[#248A3D]";

 useEffect(() => {
  setCursor(null);
  setFilters({ category: undefined, priceRange: 'all', deadlineRange: 'all', sortBy: 'new', query: '' });
}, [mode]);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      type: mode,
      limit: '20',
      sortBy: filters.sortBy,
    });

    if (filters.category) params.set('category', filters.category);
    if (filters.priceRange!== 'all') params.set('priceRange', filters.priceRange);
    if (filters.deadlineRange!== 'all') params.set('deadlineRange', filters.deadlineRange);
    if (filters.query) params.set('query', filters.query);
    if (cursor) params.set('cursor', cursor);

    return `/api/tasks?${params.toString()}`;
  }, [mode, filters, cursor]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ tasks: FeedTask[], nextCursor: string | null }>(
    apiUrl,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnMount: true,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 0,
      onError: (err: any) => {
        toast.error(err?.message || "Không tải được feed", { id: "feed-load-error" });
      },
    }
  );

  const tasks = data?.tasks?? (mode === "task"? initialJobs : initialPlans);
  const nextCursor = data?.nextCursor?? null;

  const handleApplyFilters = useCallback((newFilters: any) => {
    setFilters({
      category: newFilters.category || undefined,
      priceRange: newFilters.priceRange || 'all',
      deadlineRange: newFilters.deadlineRange || 'all',
      sortBy: newFilters.sortBy || 'new',
      query: newFilters.query || '',
    });
    setCursor(null);
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(isActiveFeedItem);
  }, [tasks]);

  const handleRefresh = useCallback(() => {
    vibrate(10);
    setCursor(null);
    mutate();
  }, [mutate]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor) setCursor(nextCursor);
  }, [nextCursor]);

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<FeedTask>) => {
    mutate(current => {
      if (!current) return current;
      return {
    ...current,
        tasks: current.tasks.map(item => item.id === taskId? ({...item,...updates } as FeedTask) : item)
      };
    }, false);
  }, [mutate]);

  const handleDelete = useCallback((id: string) => {
    mutate(current => {
      if (!current) return current;
      return {
    ...current,
        tasks: current.tasks.filter(item => item.id!== id)
      };
    }, false);
  }, [mutate]);

  const handleShare = useCallback((task: FeedTask) => {
    vibrate(5);
    setShareTask(task);
  }, []);

  const switchMode = (nextMode: "task" | "plan") => {
    if (nextMode === mode) return;
    vibrate([10, 20, 10]);
    setMode(nextMode);
  };

  const loading = isLoading;
  const refreshing = isValidating;
  const showError =!!error;
  const modeNoun = isTaskMode? "công việc" : "sự kiện";

  return (
    <div className="bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white">
      <div className="sticky top-0 z-40 bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-[680px] px-4 pt-3 pb-3">
          <div className="relative h-14 rounded-[1.6rem] bg-white dark:bg-zinc-900 ring-1 ring-black/[0.08] dark:ring-white/10 overflow-hidden shadow-sm">
            <motion.div
              className={`absolute top-0 bottom-0 rounded-[1.6rem] bg-gradient-to-r ${gradient}`}
              initial={false}
              animate={{
                left: isTaskMode? "0%" : "44%",
                width: "56%",
              }}
              transition={{ type: "spring", stiffness: 340, damping: 38, mass: 0.6 }}
            >
              <div className="absolute inset-0 rounded-[1.6rem] bg-gradient-to-b from-white/30 via-white/5 to-black/10" />
              <div className="absolute inset-[1px] rounded-[1.5rem] ring-1 ring-inset ring-white/25" />
            </motion.div>

            <div className="relative grid grid-cols-[56fr_44fr] h-full">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                aria-pressed={isTaskMode}
                onClick={() => switchMode("task")}
                className={`relative flex items-center justify-center gap-2 text-base font-black transition-colors duration-200 ${
                  isTaskMode? "text-white" : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                <HiBolt size={22} />
                <span>Công việc</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                aria-pressed={!isTaskMode}
                onClick={() => switchMode("plan")}
                className={`relative flex items-center justify-center gap-2 text-base font-black transition-colors duration-200 ${
            !isTaskMode? "text-white" : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                <HiCalendarDays size={22} />
                <span>Sự kiện</span>
              </motion.button>
            </div>
          </div>

          <CustomFilterBar
            onOpenSearch={() => setShowSearchModal(true)}
            showSearchModal={showSearchModal}
            onCloseSearch={() => setShowSearchModal(false)}
            onApplyFilters={handleApplyFilters}
          />
        </div>
      </div>

      <div className="mx-auto max-w-[680px] px-4 pt-4">
        {loading? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <div
                className="h-16 w-16 rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, transparent, ${accent})`,
                  maskImage: 'radial-gradient(transparent 55%, black 56%)'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full" style={{ background: accent }} />
              </div>
            </motion.div>
            <div className="text-center space-y-2">
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">Đang tải {modeNoun}</p>
              <p className="text-xs font-semibold text-zinc-400">Chờ chút nhé...</p>
            </div>
          </div>
        ) : showError? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-20"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500/20 blur-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-red-500 to-red-600 shadow-xl shadow-red-500/30">
                <FiInbox className="h-9 w-9 text-white" />
              </div>
            </div>
            <div className="text-center space-y-2 max-w-xs">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">Feed đang gián đoạn</h2>
              <p className="text-sm font-semibold text-zinc-500 leading-relaxed">
                Không kết nối được máy chủ. Kiểm tra mạng và thử lại nhé.
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleRefresh}
              className="h-12 rounded-2xl px-6 text-base font-bold text-white shadow-lg"
              style={{ background: gradient }}
            >
              <FiRefreshCw className="inline mr-2 h-4 w-4" />
              Tải lại ngay
            </motion.button>
          </motion.div>
     ) : filteredTasks.length === 0? (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-20"
  >
    <div className="relative">
      <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: `${accent}20` }} />
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl"
        style={{ background: gradient }}
      >
        <FiSearch className="h-9 w-9 text-white" />
      </div>
    </div>
    <div className="text-center space-y-2 max-w-xs">
      <h2 className="text-xl font-black text-zinc-900 dark:text-white">
        Chưa có {modeNoun} phù hợp
      </h2>
      <p className="text-sm font-semibold text-zinc-500 leading-relaxed">
        Thử đổi bộ lọc, tìm từ khóa khác hoặc tạo mục mới để bắt đầu.
      </p>
    </div>
    <div className="flex gap-2">
      <motion.button
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={handleRefresh}
        className="h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 px-6 text-base font-bold text-zinc-700 dark:text-zinc-200"
      >
        Tải lại
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={() => setShowSearchModal(true)}
        className="h-12 rounded-2xl px-6 text-base font-bold text-white shadow-lg"
        style={{ background: gradient }}
      >
        Tìm kiếm
      </motion.button>
    </div>
  </motion.div>
) : (
          <AnimatePresence mode="popLayout">
            <motion.div key={mode} initial={reduceMotion? false : { opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {filteredTasks.map((task, idx) => (
                <motion.div
                  key={task.id}
                  initial={reduceMotion? false : { opacity: 0, y: 18, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: reduceMotion? 0 : Math.min(idx * 0.03, 0.2),
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                  }}
                  layout={!reduceMotion}
                >
                  <TaskCard task={task} theme={mode} onDelete={handleDelete} onShare={handleShare} onTaskUpdate={handleTaskUpdate} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {nextCursor &&!loading && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleLoadMore}
            disabled={isValidating}
            className="w-full h-12 mt-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-bold text-base disabled:opacity-50 shadow-sm"
          >
            {isValidating? (
              <span className="flex items-center justify-center gap-2">
                <FiRefreshCw className="animate-spin h-4 w-4" />
                Đang tải...
              </span>
            ) : 'Xem thêm'}
          </motion.button>
        )}

        {refreshing &&!loading && (
          <div className="flex justify-center py-6">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <FiRefreshCw style={{ color: accent }} size={24} />
            </motion.div>
          </div>
        )}
        {shareTask && <ShareTaskModal task={shareTask} onClose={() => setShareTask(null)} />}
        <div className="h-2" />
      </div>
    </div>
  );
}