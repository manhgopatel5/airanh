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

type TabId = "hot" | "nearby" | "friends" | "new";

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

interface TaskFeedPageProps {
  initialJobs?: FeedTask[];
  initialPlans?: FeedTask[];
}

export default function TaskFeedPage({ initialJobs = [], initialPlans = [] }: TaskFeedPageProps) {
  const reduceMotion = useReducedMotion();
  const { mode = "task", setMode } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  const [shareTask, setShareTask] = useState<FeedTask | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQueries, setSearchQueries] = useState<Record<TabId, string>>({ hot: "", nearby: "", friends: "", new: "" });
  // THÊM STATE NÀY ĐỂ MỞ SEARCH MODAL
  const [showSearchModal, setShowSearchModal] = useState(false);

  const isTaskMode = mode === "task";
  const accent = isTaskMode? "#0A84FF" : "#30D158";
  const gradient = isTaskMode? "from-[#0A84FF] to-[#0051D5]" : "from-[#30D158] to-[#248A3D]";

  const swrOptions = {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 300000,
    keepPreviousData: false,
    refreshInterval: 0,
    shouldRetryOnError: false,
    onError: (err: any) => toast.error(err?.message || "Không tải được feed", { id: "feed-load-error" }),
  };

  const taskFeed = useSWR<FeedTask[]>(
    "/api/jobs?type=task&limit=12",
    fetcher,
    {
    ...swrOptions,
      fallbackData: initialJobs,
      revalidateOnMount: initialJobs.length === 0,
    }
  );

  const planFeed = useSWR<FeedTask[]>(
    "/api/jobs?type=plan&limit=12",
    fetcher,
    {
    ...swrOptions,
      fallbackData: initialPlans,
      revalidateOnMount: initialPlans.length === 0,
    }
  );

  const activeFeed = mode === "task"? taskFeed : planFeed;
  const tasks = activeFeed.data || [];
  const error = activeFeed.error;
  const isLoading = activeFeed.isLoading;
  const isValidating = activeFeed.isValidating;
  const mutate = activeFeed.mutate;

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

  const handleSearchChange = useCallback((filter: TabId, query: string) => {
    setSearchQueries((prev) => ({...prev, [filter]: query }));
  }, []);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) =>!task.banned &&!task.hidden && task.type === mode);
    const query = searchQueries[activeTab]?.trim().toLowerCase();
    if (query) {
      result = result.filter((task) => `${task.title} ${task.description || ""} ${task.category || ""}`.toLowerCase().includes(query));
    }

    if (activeTab === "hot") {
      result = [...result].sort((a, b) => (b.likeCount || 0) + (b.commentCount || 0) - ((a.likeCount || 0) + (a.commentCount || 0)));
    }
    if (activeTab === "new") {
      result = [...result].sort((a, b) => (b.createdAt? new Date(b.createdAt).getTime() : 0) - (a.createdAt? new Date(a.createdAt).getTime() : 0));
    }
    if (activeTab === "nearby" && userLocation) {
      result = result.filter(hasLocation).sort((a, b) => geofire.distanceBetween([userLocation.lat, userLocation.lng], [a.location.lat, a.location.lng]) - geofire.distanceBetween([userLocation.lat, userLocation.lng], [b.location.lat, b.location.lng]));
    }
    if (activeTab === "friends") result = [];
    return result;
  }, [activeTab, mode, searchQueries, tasks, userLocation]);

  const handleRefresh = useCallback(() => {
    vibrate(10);
    mutate();
  }, [mutate]);

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<FeedTask>) => {
    mutate((current: FeedTask[] = []) => current.map((item) => item.id === taskId? ({...item,...updates } as FeedTask) : item), { revalidate: false });
  }, [mutate]);

  const handleDelete = useCallback((id: string) => {
    mutate((current: FeedTask[] = []) => current.filter((item) => item.id!== id), { revalidate: false });
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

  const loading = isLoading && tasks.length === 0;
  const refreshing = isValidating &&!loading;
  const modeNoun = isTaskMode? "task" : "plan";

  return (
    <div className="bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white">
      <div className="sticky top-0 z-40 bg-white dark:bg-zinc-950">
    <div className="mx-auto max-w-[680px] px-4 pt-3 pb-3">
  {/* TOGGLE TASK/PLAN - BẢN HOÀN HẢO */}
  <div className="relative h-14 rounded-[1.5rem] bg-zinc-100/80 ring-1 ring-black/5 dark:bg-zinc-900/90 dark:ring-white/10 overflow-hidden shadow-inner">
    {/* LỚP NỀN GRADIENT TRÀN FULL */}
    <motion.div
      className="absolute inset-0"
      initial={false}
      animate={{
        background: isTaskMode
         ? "linear-gradient(135deg, #0A84FF 0%, #0066CC 50%, #0051D5 100%)"
          : "linear-gradient(135deg, #30D158 0%, #28B34A 50%, #248A3D 100%)"
      }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    />

    {/* SHINE SWEEP KHI ĐỔI TAB */}
    <AnimatePresence mode="wait">
      <motion.div
        key={isTaskMode? 'task' : 'plan'}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </AnimatePresence>

    {/* GLOW EFFECT THEO TAB */}
    <motion.div
      className="absolute inset-0 blur-2xl opacity-60"
      animate={{
        background: isTaskMode
         ? "radial-gradient(60% 80% at 25% 50%, #0A84FF 0%, transparent 100%)"
          : "radial-gradient(60% 80% at 75% 50%, #30D158 0%, transparent 100%)"
      }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    />

    {/* NÚT BẤM */}
    <div className="relative grid grid-cols-2 h-full">
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.02 }}
        aria-pressed={isTaskMode}
        onClick={() => switchMode("task")}
        className={`relative flex items-center justify-center gap-2 text-sm font-black transition-all duration-300 ${
          isTaskMode
           ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        <motion.div
          animate={{
            rotate: isTaskMode? [0, -15, 15, -10, 0] : 0,
            scale: isTaskMode? [1, 1.2, 1] : 1
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <HiBolt size={20} />
        </motion.div>
        <span className="relative">
          Task
          {isTaskMode && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white rounded-full"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </span>
      </motion.button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.02 }}
        aria-pressed={!isTaskMode}
        onClick={() => switchMode("plan")}
        className={`relative flex items-center justify-center gap-2 text-sm font-black transition-all duration-300 ${
         !isTaskMode
           ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        <motion.div
          animate={{
            rotate:!isTaskMode? [0, -15, 15, -10, 0] : 0,
            scale:!isTaskMode? [1, 1.2, 1] : 1
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <HiCalendarDays size={20} />
        </motion.div>
        <span className="relative">
          Plan
          {!isTaskMode && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white rounded-full"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </span>
      </motion.button>
    </div>
  </div>

  {/* SEARCH BAR */}
  <CustomFilterBar
    currentFilter={activeTab}
    onChangeFilter={setActiveTab}
    searchQueries={searchQueries}
    onSearchChange={handleSearchChange}
    onOpenSearch={() => setShowSearchModal(true)}
    showSearchModal={showSearchModal}
    onCloseSearch={() => setShowSearchModal(false)}
  />
</div>
</div>

<div className="mx-auto max-w-[680px] px-4 pt-4">
  {loading? (
    <div className="space-y-3" aria-label="Đang tải feed">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-52 rounded-[2rem] bg-white motion-safe:animate-pulse dark:bg-zinc-900" />
      ))}
    </div>
  ) : error? (
    <div className="rounded-[2rem] border border-red-200 bg-white/82 p-8 text-center shadow-xl shadow-red-500/5 dark:border-red-500/20 dark:bg-zinc-900/80">
      <FiInbox className="mx-auto h-9 w-9 text-red-500" />
      <h2 className="mt-4 text-xl font-black">Feed đang gián đoạn</h2>
      <p className="mt-2 text-sm text-zinc-500">Thử tải lại để đồng bộ dữ liệu mới nhất.</p>
      <button type="button" onClick={handleRefresh} className="mt-5 h-11 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white dark:bg-white dark:text-zinc-950">Tải lại</button>
    </div>
  ) : filteredTasks.length === 0? (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-white/70 bg-white/82 p-8 text-center shadow-xl shadow-black/[0.04] dark:border-white/10 dark:bg-zinc-900/80"
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