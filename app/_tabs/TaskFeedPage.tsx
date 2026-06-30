"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import useSWRInfinite from "swr/infinite";
import { useInView } from "react-intersection-observer";
import { FiInbox, FiRefreshCw, FiSearch } from "react-icons/fi";
import { HiBolt, HiCalendarDays } from "react-icons/hi2";
import { toast } from "sonner";
import ShareTaskModal from "@/components/ShareTaskModal";
import FeedSearchPanel from "@/components/feed/FeedSearchPanel";
import TaskCard from "@/components/task/TaskCard";
import { useAppStore } from "@/store/app";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase";
import { useProvinces } from "@/lib/useProvinces";
import {
  buildFeedApiUrl,
  mergeFeedPages,
  hasActiveFilters,
  getFilterSummary,
  type FeedFilters,
  type FeedPage,
} from "@/lib/feed";
import type { FeedTask } from "@/types/task";
import { isActiveFeedItem } from "@/types/task";

const fetcher = async (url: string): Promise<FeedPage> => {
  const headers: HeadersInit = {};
  const authUser = getFirebaseAuth().currentUser;
  if (authUser) {
    headers.Authorization = `Bearer ${await authUser.getIdToken()}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Không tải được feed");
  return res.json();
};

const vibrate = (pattern: number | number[] = 6) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
};

const DEFAULT_FILTERS: FeedFilters = {
  category: undefined,
  priceRange: "all",
  deadlineRange: "all",
  sortBy: "new",
  query: "",
  scope: "all",
};

type TaskFeedPageProps = {
  initialJobs: FeedTask[];
  initialPlans: FeedTask[];
};

export default function TaskFeedPage({ initialJobs, initialPlans }: TaskFeedPageProps) {
  const reduceMotion = useReducedMotion();
  const mode = useAppStore((s) => s.mode) ?? "task";
  const setMode = useAppStore((s) => s.setMode);
  const { user } = useAuth();
  const provinces = useProvinces();

  const provinceMap = useMemo(() => {
    const map = new Map<string, string>();
    provinces.forEach((p) => {
      const short = p.name.replace("Thành phố ", "").replace("Tỉnh ", "");
      map.set(short, p.name);
      map.set(p.name, p.name);
      map.set(p.code, p.name);
    });
    return map;
  }, [provinces]);

  const [shareTask, setShareTask] = useState<FeedTask | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);

  const isTaskMode = mode === "task";
  const accent = isTaskMode ? "#0A84FF" : "#30D158";
  const gradient = isTaskMode ? "from-[#0A84FF] to-[#0051D5]" : "from-[#30D158] to-[#248A3D]";

  const filtersKey = useMemo(() => JSON.stringify({ mode, ...filters }), [mode, filters]);

  const getKey = useCallback(
    (pageIndex: number, previousPageData: FeedPage | null) => {
      if (previousPageData && !previousPageData.nextCursor) return null;
      const cursor = pageIndex === 0 ? null : previousPageData?.nextCursor ?? null;
      return buildFeedApiUrl(mode, filters, cursor);
    },
    [mode, filters]
  );

  const fallbackData = useMemo<FeedPage[]>(
    () => [{ tasks: isTaskMode ? initialJobs : initialPlans, nextCursor: null }],
    [isTaskMode, initialJobs, initialPlans]
  );

  const { data, error, isLoading, isValidating, mutate, setSize } = useSWRInfinite<FeedPage>(
    getKey,
    fetcher,
    {
      fallbackData,
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
      revalidateFirstPage: false,
      parallel: false,
      onError: (err: Error) => {
        toast.error(err?.message || "Không tải được feed", { id: "feed-load-error" });
      },
    }
  );

  useEffect(() => {
    setSize(1);
  }, [filtersKey, setSize]);

  const tasks = useMemo(() => {
    if (!data?.length) {
      return isTaskMode ? initialJobs : initialPlans;
    }
    return mergeFeedPages(data);
  }, [data, isTaskMode, initialJobs, initialPlans]);

  const nextCursor = data?.[data.length - 1]?.nextCursor ?? null;
  const hasMore = !!nextCursor;

  const { ref: loadMoreRef, inView } = useInView({
    rootMargin: "480px 0px",
    threshold: 0,
  });

  useEffect(() => {
    if (inView && hasMore && !isValidating) {
      setSize((current) => current + 1);
    }
  }, [inView, hasMore, isValidating, setSize]);

  const handleApplyFilters = useCallback((newFilters: FeedFilters) => {
    setFilters(newFilters);
  }, []);

  const filterChips = useMemo(() => getFilterSummary(filters, mode), [filters, mode]);

  const filteredTasks = useMemo(() => tasks.filter(isActiveFeedItem), [tasks]);

  const handleRefresh = useCallback(() => {
    vibrate(10);
    setSize(1);
    mutate();
  }, [mutate, setSize]);

  const updateTasksInCache = useCallback(
    (updater: (items: FeedTask[]) => FeedTask[]) => {
      mutate(
        (pages) => {
          if (!pages?.length) return pages;
          const flat = mergeFeedPages(pages);
          const updated = updater(flat);
          const byId = new Map(updated.map((item) => [item.id, item]));
          return pages.map((page) => ({
            ...page,
            tasks: page.tasks.map((item) => byId.get(item.id) ?? item),
          }));
        },
        false
      );
    },
    [mutate]
  );

  const handleTaskUpdate = useCallback(
    (taskId: string, updates: Partial<FeedTask>) => {
      updateTasksInCache((items) =>
        items.map((item) => (item.id === taskId ? ({ ...item, ...updates } as FeedTask) : item))
      );
    },
    [updateTasksInCache]
  );

  const handleDelete = useCallback(
    (id: string) => {
      updateTasksInCache((items) => items.filter((item) => item.id !== id));
    },
    [updateTasksInCache]
  );

  const handleShare = useCallback((task: FeedTask) => {
    vibrate(5);
    setShareTask(task);
  }, []);

  const switchMode = (nextMode: "task" | "plan") => {
    if (nextMode === mode) return;
    vibrate([10, 20, 10]);
    setMode(nextMode);
    setFilters(DEFAULT_FILTERS);
  };

  const loading = isLoading && !data?.length;
  const refreshing = isValidating && !!data?.length;
  const showError = !!error && !data?.length;
  const modeNoun = isTaskMode ? "công việc" : "sự kiện";
  const currentUserId = user?.uid;

  return (
    <div className="bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white">
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto max-w-[680px] px-4 pt-3 pb-3">
          <div className="relative h-14 rounded-[1.6rem] bg-white dark:bg-zinc-900 ring-1 ring-black/[0.08] dark:ring-white/10 overflow-hidden shadow-sm">
            <motion.div
              className={`absolute top-0 bottom-0 rounded-[1.6rem] bg-gradient-to-r ${gradient}`}
              initial={false}
              animate={{
                left: isTaskMode ? "0%" : "44%",
                width: "56%",
              }}
              transition={{ type: "spring", stiffness: 340, damping: 38, mass: 0.6 }}
            >
              <div className="absolute inset-0 rounded-[1.6rem] bg-gradient-to-b from-white/30 via-white/5 to-black/10" />
              <div className="absolute inset-[1px] rounded-[1.5rem] ring-1 ring-inset ring-white/25" />
            </motion.div>

            <div className="relative grid grid-cols-[56fr_44fr] h-full">
              <button
                type="button"
                aria-pressed={isTaskMode}
                onClick={() => switchMode("task")}
                className={`relative flex items-center justify-center gap-2 text-base font-black transition-colors duration-200 active:scale-[0.97] ${
                  isTaskMode
                    ? "text-white"
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                <HiBolt size={22} />
                <span>Công việc</span>
              </button>

              <button
                type="button"
                aria-pressed={!isTaskMode}
                onClick={() => switchMode("plan")}
                className={`relative flex items-center justify-center gap-2 text-base font-black transition-colors duration-200 active:scale-[0.97] ${
                  !isTaskMode
                    ? "text-white"
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                <HiCalendarDays size={22} />
                <span>Sự kiện</span>
              </button>
            </div>
          </div>

          <FeedSearchPanel
            mode={mode}
            open={showSearchModal}
            onOpen={() => setShowSearchModal(true)}
            onClose={() => setShowSearchModal(false)}
            onApply={handleApplyFilters}
            currentFilters={filters}
            isLoggedIn={!!user}
          />

          {hasActiveFilters(filters) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {filterChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300"
                >
                  {chip}
                </span>
              ))}
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="inline-flex rounded-full px-3 py-1 text-xs font-semibold text-[#0A84FF]"
              >
                Xóa lọc
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[680px] px-4 pt-4">
        {loading ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-20">
            <div
              className="h-16 w-16 rounded-full animate-spin"
              style={{
                background: `conic-gradient(from 0deg, transparent, ${accent})`,
                maskImage: "radial-gradient(transparent 55%, black 56%)",
              }}
            />
            <div className="text-center space-y-2">
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">Đang tải {modeNoun}</p>
              <p className="text-xs font-semibold text-zinc-400">Chờ chút nhé...</p>
            </div>
          </div>
        ) : showError ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-20">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
              <FiInbox className="h-9 w-9 text-white" />
            </div>
            <div className="text-center space-y-2 max-w-xs">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">Feed đang gián đoạn</h2>
              <p className="text-sm font-semibold text-zinc-500 leading-relaxed">
                Không kết nối được máy chủ. Kiểm tra mạng và thử lại nhé.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="h-12 rounded-2xl px-6 text-base font-bold text-white shadow-lg active:scale-[0.97]"
              style={{ background: `linear-gradient(to right, ${isTaskMode ? "#0A84FF, #0051D5" : "#30D158, #248A3D"})` }}
            >
              <FiRefreshCw className="inline mr-2 h-4 w-4" />
              Tải lại ngay
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-20">
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg"
              style={{ background: `linear-gradient(to right, ${isTaskMode ? "#0A84FF, #0051D5" : "#30D158, #248A3D"})` }}
            >
              <FiSearch className="h-9 w-9 text-white" />
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
              <button
                type="button"
                onClick={handleRefresh}
                className="h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 px-6 text-base font-bold text-zinc-700 dark:text-zinc-200 active:scale-[0.97]"
              >
                Tải lại
              </button>
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                className="h-12 rounded-2xl px-6 text-base font-bold text-white shadow-lg active:scale-[0.97]"
                style={{ background: `linear-gradient(to right, ${isTaskMode ? "#0A84FF, #0051D5" : "#30D158, #248A3D"})` }}
              >
                Tìm kiếm
              </button>
            </div>
          </div>
        ) : (
          <div key={mode} className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task.id} className="feed-item">
                <TaskCard
                  task={task}
                  theme={mode}
                  currentUserId={currentUserId}
                  provinceMap={provinceMap}
                  onDelete={handleDelete}
                  onShare={handleShare}
                  onTaskUpdate={handleTaskUpdate}
                />
              </div>
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <div ref={loadMoreRef} className="flex justify-center py-6 min-h-[48px]">
            {isValidating && (
              <FiRefreshCw className="animate-spin h-5 w-5" style={{ color: accent }} />
            )}
          </div>
        )}

        {refreshing && !reduceMotion && (
          <div className="pointer-events-none fixed top-[calc(env(safe-area-inset-top)+8px)] left-1/2 z-50 -translate-x-1/2 rounded-full bg-white/90 dark:bg-zinc-900/90 px-3 py-1.5 shadow-md">
            <FiRefreshCw className="animate-spin h-4 w-4" style={{ color: accent }} />
          </div>
        )}

        {shareTask && <ShareTaskModal task={shareTask} onClose={() => setShareTask(null)} />}
        <div className="h-2" />
      </div>
    </div>
  );
}
