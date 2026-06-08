"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as geofire from "geofire-common";
import useSWR from "swr";
import {
  FiInbox,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";
import { HiBolt, HiCalendarDays } from "react-icons/hi2";
import { toast } from "sonner";
import ShareTaskModal from "@/components/ShareTaskModal";
import CustomFilterBar from "@/components/common/CustomFilterBar";
import TaskCard from "@/components/task/TaskCard";
import { useAppStore } from "@/store/app";
import type { FeedTask } from "@/types/task";

type TabId = "hot" | "nearby" | "new";
type SortBy = "views" | "recent" | "price_asc" | "price_desc";
type FilterTab = "hot" | "nearby" | "new";

type TaskWithLocation = FeedTask & {
  location: { lat: number; lng: number };
};

const hasLocation = (task: FeedTask): task is TaskWithLocation => {
  return task.location?.lat!= null && task.location?.lng!= null;
};

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
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  const [shareTask, setShareTask] = useState<FeedTask | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [filters, setFilters] = useState({
    categories: [] as string[],
    priceRange: 'all',
    sortBy: 'views' as SortBy,
    query: '',
  });

  const [searchQueries, setSearchQueries] = useState<Record<FilterTab, string>>({
    hot: '',
    nearby: '',
    new: ''
  });

  const [cursor, setCursor] = useState<number | null>(null);

  const isTaskMode = mode === "task";
  const accent = isTaskMode? "#0A84FF" : "#30D158";
  const gradient = isTaskMode? "from-[#0A84FF] to-[#0051D5]" : "from-[#30D158] to-[#248A3D]";

  useEffect(() => {
    setCursor(null);
    setHasSearched(false);
    setFilters({ categories: [], priceRange: 'all', sortBy: 'views', query: '' });
    setActiveTab("hot");
  }, [mode]);

useEffect(() => {
  if (activeTab === 'hot') setFilters(prev => ({...prev, sortBy: 'views' }));
  if (activeTab === 'new') setFilters(prev => ({...prev, sortBy: 'recent' }));
}, [activeTab]);

  const apiUrl = useMemo(() => {
  if (!hasSearched && cursor === null) return null;

  const params = new URLSearchParams({
    type: mode,
    limit: '20',
    sortBy: filters.sortBy, // FIX: Dùng luôn filters.sortBy, bỏ logic activeTab
  });

  // Chỉ override khi sortBy vẫn là default 'views' và tab là hot/new
  if (filters.sortBy === 'views') {
    if (activeTab === 'hot') params.set('sortBy', 'hot');
    if (activeTab === 'new') params.set('sortBy', 'new');
  }

  if (filters.categories.length > 0) params.set('categories', filters.categories.join(','));
  if (filters.priceRange!== 'all') params.set('priceRange', filters.priceRange);
  if (filters.query) params.set('query', filters.query);
  if (cursor) params.set('cursor', cursor.toString());

  return `/api/tasks?${params.toString()}`;
}, [mode, activeTab, filters, cursor, hasSearched]);
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ tasks: FeedTask[], nextCursor: number | null }>(
  apiUrl,
  fetcher,
  {
    fallbackData: hasSearched? undefined : { // FIX: Chỉ dùng fallback khi chưa search
      tasks: mode === "task"? initialJobs : initialPlans,
      nextCursor: null
    },
    revalidateOnMount: true, // FIX: Đổi thành true
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 0,
    keepPreviousData: false,
    refreshInterval: 0,
    shouldRetryOnError: false,
    onError: (err: any) => {
      if (hasSearched) {
        toast.error(err?.message || "Không tải được feed", { id: "feed-load-error" });
      }
    },
  }
);

  const tasks = data?.tasks?? (mode === "task"? initialJobs : initialPlans);
  const nextCursor = data?.nextCursor || null;

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Thiết bị không hỗ trợ định vị GPS");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        vibrate([10, 20, 10]);
        toast.success("Đã xác định vị trí");
      },
      (err) => {
        toast.error(err.code === 1? "Bạn đã chặn quyền truy cập vị trí" : "Không thể lấy vị trí. Thử lại sau");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (activeTab === "nearby" &&!userLocation) requestLocation();
  }, [activeTab, requestLocation, userLocation]);

// 2. Chỉ khi bấm "Áp dụng" mới fetch
const handleApplyFilters = useCallback(async (newFilters: any) => {
  const newTab = newFilters.tab || activeTab;
  const newFilterState = {
    categories: newFilters.categories || [],
    priceRange: newFilters.priceRange || 'all',
    sortBy: newFilters.sortBy || 'views',
    query: newFilters.query || '',
  };
  
  setActiveTab(newTab);
  setFilters(newFilterState);
  setSearchQueries(prev => ({...prev, [newTab]: newFilters.query || '' }));
  setCursor(null);
  setHasSearched(true); // Chỉ set ở đây
}, [activeTab]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) =>!task.banned &&!task.hidden);

    if (activeTab === "nearby" && userLocation) {
      result = result.filter(hasLocation).sort((a, b) =>
        geofire.distanceBetween([userLocation.lat, userLocation.lng], [a.location.lat, a.location.lng]) -
        geofire.distanceBetween([userLocation.lat, userLocation.lng], [b.location.lat, b.location.lng])
      );
    }
    return result;
  }, [activeTab, tasks, userLocation]);

  const handleRefresh = useCallback(() => {
    vibrate(10);
    setCursor(null);
    setHasSearched(true);
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
    setCursor(null);
    setHasSearched(false);
    setMode(nextMode);
  };

  const loading = isLoading && hasSearched;
  const refreshing = isValidating && hasSearched;
  const showError = error && hasSearched;
  const modeNoun = isTaskMode? "task" : "plan";

  return (
    <div className="bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white">
      <div className="sticky top-0 z-40 bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-[680px] px-4 pt-3 pb-3">
          <div className="relative h-14 rounded-[1.6rem] bg-white dark:bg-zinc-900 ring-1 ring-black/[0.08] dark:ring-white/10 overflow-hidden shadow-sm">
            <motion.div
              className="absolute top-0 bottom-0 rounded-[1.6rem]"
              initial={false}
              animate={{
                left: isTaskMode? "0%" : "44%",
                width: "56%",
                background: isTaskMode
          ? "linear-gradient(135deg, #0A84FF 0%, #0066CC 50%, #0051D5 100%)"
                  : "linear-gradient(135deg, #30D158 0%, #28B34A 50%, #248A3D 100%)"
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
                className={`relative flex items-center justify-center gap-2 text- font-black transition-colors duration-200 ${
                  isTaskMode? "text-white" : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                <HiBolt size={22} />
                <span>Task</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                aria-pressed={!isTaskMode}
                onClick={() => switchMode("plan")}
                className={`relative flex items-center justify-center gap-2 text- font-black transition-colors duration-200 ${
          !isTaskMode? "text-white" : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                <HiCalendarDays size={22} />
                <span>Plan</span>
              </motion.button>
            </div>
          </div>


<CustomFilterBar
  currentFilter={activeTab}
  onChangeFilter={setActiveTab}
  searchQueries={searchQueries}
  
  
  onOpenSearch={() => setShowSearchModal(true)}
  showSearchModal={showSearchModal}
  onCloseSearch={() => setShowSearchModal(false)}
  onApplyFilters={handleApplyFilters}
/>
        </div>
      </div>

      <div className="mx-auto max-w-[680px] px-4 pt-4">
        {loading? (
          <div className="space-y-3" aria-label="Đang tải feed">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-52 rounded- bg-white motion-safe:animate-pulse dark:bg-zinc-900" />
            ))}
          </div>
        ) : showError? (
          <div className="rounded- border border-red-200 bg-white/82 p-8 text-center shadow-xl shadow-red-500/5 dark:border-red-500/20 dark:bg-zinc-900/80">
            <FiInbox className="mx-auto h-9 w-9 text-red-500" />
            <h2 className="mt-4 text-xl font-black">Feed đang gián đoạn</h2>
            <p className="mt-2 text-sm text-zinc-500">Thử tải lại để đồng bộ dữ liệu mới nhất.</p>
            <button type="button" onClick={handleRefresh} className="mt-5 h-11 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white dark:bg-white dark:text-zinc-950">Tải lại</button>
          </div>
        ) : filteredTasks.length === 0? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded- border border-white/70 bg-white/82 p-8 text-center shadow-xl shadow-black/[0.04] dark:border-white/10 dark:bg-zinc-900/80"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
              <FiSearch className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-xl font-black">Chưa có {modeNoun} phù hợp</h2>
            <p className="mx-auto mt-2 max-w-[320px] text-sm leading-6 text-zinc-500">
              {activeTab === "nearby" &&!userLocation? "Bật định vị để khám phá cơ hội quanh bạn." : "Thử đổi bộ lọc, tìm từ khóa khác hoặc tạo mục mới để bắt đầu."}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              {activeTab === "nearby" &&!userLocation && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={requestLocation}
                  className={`h-11 rounded-2xl bg-gradient-to-r ${gradient} px-5 text-sm font-black text-white shadow-lg`}
                >
                  Bật định vị
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleRefresh}
                className="h-11 rounded-2xl bg-zinc-100 px-5 text-sm font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                Tải lại
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div key={`${mode}-${activeTab}`} initial={reduceMotion? false : { opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
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
            className="w-full h-11 mt-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-black text-sm disabled:opacity-50"
          >
            {isValidating? 'Đang tải...' : 'Xem thêm'}
          </motion.button>
        )}

        {refreshing && (
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