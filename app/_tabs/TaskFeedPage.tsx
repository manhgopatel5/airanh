"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as geofire from "geofire-common";
import useSWR from "swr";
import {
  FiCompass,
  FiInbox,
  FiMapPin,
  FiMessageCircle,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrendingUp,
} from "react-icons/fi";
import { HiBolt, HiCalendarDays, HiSparkles } from "react-icons/hi2";
import { toast } from "sonner";
import ShareTaskModal from "@/components/ShareTaskModal";
import CustomFilterBar from "@/components/common/CustomFilterBar";
import TaskCard from "@/components/task/TaskCard";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAppStore } from "@/store/app";
import type { FeedTask } from "@/types/task";

type TabId = "hot" | "nearby" | "friends" | "new";

type TaskWithLocation = FeedTask & {
  location: { lat: number; lng: number };
};

const hasLocation = (task: FeedTask): task is TaskWithLocation => {
  return task.location?.lat != null && task.location?.lng != null;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Không tải được feed");
  return res.json();
};

const vibrate = (pattern: number | number[] = 6) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
};

interface TaskFeedPageProps {
  initialJobs?: FeedTask[];
}

export default function TaskFeedPage({ initialJobs = [] }: TaskFeedPageProps) {
  const auth = getFirebaseAuth();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { mode = "task", setMode } = useAppStore();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  const [shareTask, setShareTask] = useState<FeedTask | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQueries, setSearchQueries] = useState<Record<TabId, string>>({ hot: "", nearby: "", friends: "", new: "" });

  const isTaskMode = mode === "task";
  const accent = isTaskMode ? "#0A84FF" : "#30D158";
  const gradient = isTaskMode ? "from-[#0A84FF] to-[#0051D5]" : "from-[#30D158] to-[#248A3D]";
  const softGradient = isTaskMode
    ? "from-[#EAF4FF] via-white to-[#F8FBFF] dark:from-[#06172B] dark:via-zinc-950 dark:to-zinc-950"
    : "from-[#EAFFF2] via-white to-[#F9FFFB] dark:from-[#061E11] dark:via-zinc-950 dark:to-zinc-950";

  const { data: tasks = [], error, isLoading, isValidating, mutate } = useSWR<FeedTask[]>(
    currentUser ? `/api/jobs?type=${mode}` : null,
    fetcher,
    {
      fallbackData: initialJobs,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 45000,
      keepPreviousData: true,
      refreshInterval: 0,
      shouldRetryOnError: false,
      onError: (err) => toast.error(err?.message || "Không tải được feed", { id: "feed-load-error" }),
    }
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) router.push("/login");
    });
    return () => unsub();
  }, [auth, router]);

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
        toast.error(err.code === 1 ? "Bạn đã chặn quyền truy cập vị trí" : "Không thể lấy vị trí. Thử lại sau");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (activeTab === "nearby" && !userLocation) requestLocation();
  }, [activeTab, requestLocation, userLocation]);

  const handleSearchChange = useCallback((filter: TabId, query: string) => {
    setSearchQueries((prev) => ({ ...prev, [filter]: query }));
  }, []);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) => !task.banned && !task.hidden && task.type === mode);
    const query = searchQueries[activeTab]?.trim().toLowerCase();
    if (query) {
      result = result.filter((task) => `${task.title} ${task.description || ""} ${task.category || ""}`.toLowerCase().includes(query));
    }

    if (activeTab === "hot") {
      result = [...result].sort((a, b) => (b.likeCount || 0) + (b.commentCount || 0) - ((a.likeCount || 0) + (a.commentCount || 0)));
    }
    if (activeTab === "new") {
      result = [...result].sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    }
    if (activeTab === "nearby" && userLocation) {
      result = result.filter(hasLocation).sort((a, b) => geofire.distanceBetween([userLocation.lat, userLocation.lng], [a.location.lat, a.location.lng]) - geofire.distanceBetween([userLocation.lat, userLocation.lng], [b.location.lat, b.location.lng]));
    }
    if (activeTab === "friends") result = [];
    return result;
  }, [activeTab, mode, searchQueries, tasks, userLocation]);

  const stats = useMemo(() => {
    const visible = tasks.filter((task) => !task.banned && !task.hidden && task.type === mode);
    const open = visible.filter((task) => task.status === "open" || task.status === "pending").length;
    const totalValue = visible.reduce((sum, task) => sum + (task.type === "task" ? task.price || 0 : task.costAmount || 0), 0);
    const withLocation = visible.filter(hasLocation).length;
    return [
      { label: "Đang mở", value: open.toString(), icon: FiTrendingUp },
      { label: "Có vị trí", value: withLocation.toString(), icon: FiMapPin },
      { label: "Tổng giá trị", value: totalValue > 0 ? `${Math.round(totalValue / 1000)}k` : "Mở", icon: FiShield },
    ];
  }, [mode, tasks]);

  const handleRefresh = useCallback(() => {
    vibrate(10);
    mutate();
  }, [mutate]);

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<FeedTask>) => {
    mutate((current: FeedTask[] = []) => current.map((item) => item.id === taskId ? ({ ...item, ...updates } as FeedTask) : item), { revalidate: false });
  }, [mutate]);

  const handleDelete = useCallback((id: string) => {
    mutate((current: FeedTask[] = []) => current.filter((item) => item.id !== id), { revalidate: false });
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
  const refreshing = isValidating && !loading;
  const modeNoun = isTaskMode ? "task" : "plan";

  return (
    <div className={`min-h-dvh bg-gradient-to-b ${softGradient} text-zinc-950 dark:text-white`}>
      <div className="sticky top-0 z-40 border-b border-white/70 bg-white/82 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/82">
        <div className="mx-auto max-w-[680px] px-4 pt-3 pb-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">AIR Command</p>
              <h1 className="text-2xl font-black tracking-tight">{isTaskMode ? "Task marketplace" : "Plan hub"}</h1>
            </div>
            <button type="button" onClick={handleRefresh} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 active:scale-95 dark:bg-zinc-900 dark:text-zinc-300" aria-label="Làm mới feed">
              <FiRefreshCw className={refreshing ? "motion-safe:animate-spin" : ""} />
            </button>
          </div>

          <div className="relative rounded-[1.35rem] bg-zinc-100/80 p-1.5 ring-1 ring-black/5 dark:bg-zinc-900/90 dark:ring-white/10">
            <motion.div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-[1rem] bg-gradient-to-r ${gradient} shadow-lg`} animate={{ x: isTaskMode ? 0 : "100%" }} transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 34 }} />
            <div className="relative grid grid-cols-2 gap-1">
              <button type="button" aria-pressed={isTaskMode} onClick={() => switchMode("task")} className={`flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-black ${isTaskMode ? "text-white" : "text-zinc-500"}`}><HiBolt /> Task</button>
              <button type="button" aria-pressed={!isTaskMode} onClick={() => switchMode("plan")} className={`flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-black ${!isTaskMode ? "text-white" : "text-zinc-500"}`}><HiCalendarDays /> Plan</button>
            </div>
          </div>

          <CustomFilterBar currentFilter={activeTab} onChangeFilter={setActiveTab} searchQueries={searchQueries} onSearchChange={handleSearchChange} />
        </div>
      </div>

      <div className="mx-auto max-w-[680px] px-4 pt-4">
        <motion.section initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative mb-4 overflow-hidden rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-2xl shadow-black/[0.05] ring-1 ring-black/[0.03] backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/72 dark:ring-white/10">
          <div className={`absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br ${gradient} opacity-15 blur-3xl`} />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className={`mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${gradient} px-3 py-1 text-xs font-black text-white shadow-lg`}><HiSparkles /> Smart match ready</div>
              <h2 className="max-w-[360px] text-2xl font-black tracking-tight">Tìm việc, nhận plan và quản lý cơ hội như một app lớn.</h2>
              <p className="mt-2 max-w-[420px] text-sm leading-6 text-zinc-500 dark:text-zinc-400">Feed được xếp theo độ nóng, vị trí và độ mới. Tạo nhanh, lọc nhanh, hành động nhanh.</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl bg-zinc-50/90 p-3 ring-1 ring-black/5 dark:bg-zinc-900/70 dark:ring-white/10">
                <Icon className="h-4 w-4" style={{ color: accent }} />
                <p className="mt-2 text-lg font-black">{value}</p>
                <p className="text-[11px] font-bold text-zinc-400">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => router.push(`/create/${mode}`)} className={`flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${gradient} text-sm font-black text-white shadow-lg active:scale-[0.98]`}><FiPlus /> Tạo</button>
            <button type="button" onClick={() => router.push("/?tab=messages")} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-100 text-sm font-black text-zinc-700 active:scale-[0.98] dark:bg-zinc-900 dark:text-zinc-200"><FiMessageCircle /> Chat</button>
            <button type="button" onClick={() => setActiveTab("nearby")} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-100 text-sm font-black text-zinc-700 active:scale-[0.98] dark:bg-zinc-900 dark:text-zinc-200"><FiCompass /> Gần</button>
          </div>
        </motion.section>

        {loading ? (
          <div className="space-y-3" aria-label="Đang tải feed">
            {[0, 1, 2].map((item) => <div key={item} className="h-52 rounded-[2rem] bg-white/80 motion-safe:animate-pulse dark:bg-zinc-900/80" />)}
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-red-200 bg-white/82 p-8 text-center shadow-xl shadow-red-500/5 dark:border-red-500/20 dark:bg-zinc-900/80">
            <FiInbox className="mx-auto h-9 w-9 text-red-500" />
            <h2 className="mt-4 text-xl font-black">Feed đang gián đoạn</h2>
            <p className="mt-2 text-sm text-zinc-500">Thử tải lại để đồng bộ dữ liệu mới nhất.</p>
            <button type="button" onClick={handleRefresh} className="mt-5 h-11 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white dark:bg-white dark:text-zinc-950">Tải lại</button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-[2rem] border border-white/70 bg-white/82 p-8 text-center shadow-xl shadow-black/[0.04] dark:border-white/10 dark:bg-zinc-900/80">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800"><FiSearch className="h-7 w-7" /></div>
            <h2 className="mt-5 text-xl font-black">Chưa có {modeNoun} phù hợp</h2>
            <p className="mx-auto mt-2 max-w-[320px] text-sm leading-6 text-zinc-500">{activeTab === "nearby" && !userLocation ? "Bật định vị để khám phá cơ hội quanh bạn." : "Thử đổi bộ lọc, tìm từ khóa khác hoặc tạo mục mới để bắt đầu."}</p>
            <div className="mt-5 flex justify-center gap-2">
              {activeTab === "nearby" && !userLocation && <button type="button" onClick={requestLocation} className={`h-11 rounded-2xl bg-gradient-to-r ${gradient} px-5 text-sm font-black text-white`}>Bật định vị</button>}
              <button type="button" onClick={handleRefresh} className="h-11 rounded-2xl bg-zinc-100 px-5 text-sm font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">Tải lại</button>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div key={`${mode}-${activeTab}`} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {filteredTasks.map((task, idx) => (
                <motion.div key={task.id} initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : Math.min(idx * 0.02, 0.14) }} layout={!reduceMotion}>
                  <TaskCard task={task} theme={mode} onDelete={handleDelete} onShare={handleShare} onTaskUpdate={handleTaskUpdate} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {refreshing && <div className="flex justify-center py-6"><FiRefreshCw className="motion-safe:animate-spin" style={{ color: accent }} size={24} /></div>}
        {shareTask && <ShareTaskModal task={shareTask} onClose={() => setShareTask(null)} />}
        <div className="h-8" />
      </div>
    </div>
  );
}
