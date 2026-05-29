"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiInbox, FiRefreshCw, FiNavigation } from "react-icons/fi";
import { Briefcase3D, Palm3D } from "@/components/icons/Mode3DIcons";
import { useRouter } from "next/navigation";
import ShareTaskModal from "@/components/ShareTaskModal";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import useSWR from "swr"; // THÊM
import type { FeedTask } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";
import { toast } from "sonner";
import { useAppStore } from "@/store/app";
import * as geofire from 'geofire-common';
import CustomFilterBar from "@/components/common/CustomFilterBar";

type TabId = "hot" | "nearby" | "friends" | "new";

type TaskWithLocation = FeedTask & {
  location: { lat: number; lng: number };
};

const hasLocation = (task: FeedTask): task is TaskWithLocation => {
  return task.location?.lat!= null && task.location?.lng!= null;
};

const vibrate = (p: number | number[] = 5) => {
  if (typeof navigator!== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(p);
  }
};

interface TaskFeedPageProps {
  initialJobs?: FeedTask[];
}

// THÊM: Fetcher cho SWR
const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function TaskFeedPage({ initialJobs = [] }: TaskFeedPageProps) {
  const auth = getFirebaseAuth();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { mode = "task", setMode } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  const [shareTask, setShareTask] = useState<FeedTask | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const [searchQueries, setSearchQueries] = useState<Record<TabId, string>>({
    hot: "",
    nearby: "",
    friends: "",
    new: ""
  });

  // FIX: Dùng SWR thay onSnapshot. 0 reads nếu cache còn hạn

const { data: tasks = [], isLoading, isValidating, mutate } = useSWR<FeedTask[]>(
  currentUser? `/api/jobs?type=${mode}` : null,
  fetcher,
  {
    fallbackData: initialJobs.filter(j => j.type === mode),
    revalidateOnFocus: false, // ← Đổi từ false → false, giữ nguyên
    revalidateOnReconnect: false, // ← Thêm dòng này
    revalidateIfStale: false, // ← Thêm dòng này
    dedupingInterval: 600000, // ← Đổi từ 60000 → 600000 = 10 phút
    keepPreviousData: true,
    refreshInterval: 0, // ← Thêm dòng này
  }
);

  const loading = isLoading && tasks.length === 0;
  const refreshing = isValidating;

  const theme = {
    task: {
      primary: "#0A84FF",
      gradient: "linear-gradient(135deg, #5B9DFF 0%, #0A84FF 100%)",
      glow: "rgba(10, 132, 255, 0.5)",
    },
    plan: {
      primary: "#30D158",
      gradient: "linear-gradient(135deg, #5BEB7B 0%, #30D158 100%)",
      glow: "rgba(48, 209, 88, 0.5)",
    }
  };

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
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        vibrate([10, 20, 10]);
        toast.success("Đã xác định vị trí thành công");
      },
      (err) => {
        if (err.code === 1) toast.error("Bạn đã chặn quyền truy cập vị trí");
        else toast.error("Không thể lấy vị trí. Thử lại sau");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // XÓA: Toàn bộ useEffect onSnapshot

  useEffect(() => {
    if (activeTab === "nearby" &&!userLocation) {
      requestLocation();
    }
  }, [activeTab, userLocation, requestLocation]);

  const handleSearchChange = useCallback((filter: TabId, query: string) => {
    setSearchQueries(prev => ({...prev, [filter]: query }));
  }, []);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t =>!t.banned &&!t.hidden && t.type === mode);

    const currentQuery = searchQueries[activeTab];
    if (currentQuery) {
      result = result.filter(t =>
        t.title.toLowerCase().includes(currentQuery.toLowerCase())
      );
    }

    if (activeTab === "hot") {
      result.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    } else if (activeTab === "new") {
      result.sort((a, b) => {
        const aTime = a.createdAt? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    } else if (activeTab === "nearby" && userLocation) {
      const withLocation = result.filter(hasLocation);
      withLocation.sort((a, b) => {
        const distA = geofire.distanceBetween(
          [userLocation.lat, userLocation.lng],
          [a.location.lat, a.location.lng]
        );
        const distB = geofire.distanceBetween(
          [userLocation.lat, userLocation.lng],
          [b.location.lat, b.location.lng]
        );
        return distA - distB;
      });
      result = withLocation;
    }

    return result;
  }, [tasks, searchQueries, activeTab, userLocation, mode]);

  const handleShare = useCallback((task: FeedTask) => {
    vibrate(5);
    setShareTask(task);
  }, []);
const handleTaskUpdate = useCallback((taskId: string, updates: Partial<FeedTask>) => {
  mutate((current: FeedTask[] = []) =>
    current.map(t => t.id === taskId? ({...t,...updates } as FeedTask) : t),
    { revalidate: false } // Không phải false đứng riêng
  );
  if (updates.status === "completed") {
    vibrate([10, 20, 10]);
  }
}, [mutate]);

const handleDelete = useCallback((id: string) => {
  mutate((current: FeedTask[] = []) =>
    current.filter(t => t.id!== id),
    { revalidate: false }
  );
}, [mutate]);

const handleRefresh = useCallback(() => {
  vibrate(10);
  mutate(); // Gọi mutate() không truyền key
}, [mutate]);

  return (
    <>
      <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none">
        <div className="sticky top-0 z-40 bg-white dark:bg-zinc-950">
          <div className="px-4 pt-4 pb-2">
            <div className="relative h-16 rounded-2xl p-1.5 bg-white dark:bg-zinc-900">
              <motion.div
                className="absolute top-1.5 bottom-1.5 rounded-xl overflow-hidden pointer-events-none"
                animate={{
                  left: mode === "task"? "6px" : "calc(50% + 3px)",
                  width: "calc(50% - 9px)"
                }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 35,
                  mass: 0.8
                }}
              >
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  animate={{
                    background: mode === "task"
           ? "linear-gradient(135deg, #E3F2FF 0%, #D1E9FF 40%, #B8DEFF 100%)"
                      : "linear-gradient(135deg, #E8FFF0 0%, #D4F7E0 40%, #BEF0CE 100%)",
                    boxShadow: mode === "task"
           ? "inset 0 2px 4px rgba(10,132,255,0.25), inset 0 -2px 2px rgba(0,81,213,0.15), 0 0 20px rgba(10,132,255,0.3)"
                      : "inset 0 2px 4px rgba(48,209,88,0.25), inset 0 -2px 2px rgba(40,180,76,0.15), 0 0 20px rgba(48,209,88,0.3)"
                  }}
                  transition={{ duration: 0.6 }}
                />
                <motion.div
                  className="absolute -inset-3 rounded-xl blur-2xl opacity-80"
                  animate={{
                    background: mode === "task"
             ? "radial-gradient(circle, rgba(10,132,255,0.7) 0%, transparent 70%)"
                      : "radial-gradient(circle, rgba(48,209,88,0.7) 0%, transparent 70%)"
                  }}
                  transition={{ duration: 0.6 }}
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/70 via-white/40 to-transparent dark:from-white/20 dark:via-white/10" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90" />
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/60 to-transparent" />
              </motion.div>

              <div className="relative z-10 flex h-full">
                <button
                  onClick={() => {
                    if (mode!== "task") {
                      vibrate([10, 25, 10]);
                      setMode("task");
                    }
                  }}
                  className="flex-1 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Briefcase3D active={mode === "task"} />
                </button>
                <button
                  onClick={() => {
                    if (mode!== "plan") {
                      vibrate([10, 25, 10]);
                      setMode("plan");
                    }
                  }}
                  className="flex-1 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Palm3D active={mode === "plan"} />
                </button>
              </div>
            </div>
          </div>
          <CustomFilterBar
            currentFilter={activeTab}
            onChangeFilter={setActiveTab}
            searchQueries={searchQueries}
            onSearchChange={handleSearchChange}
          />
        </div>

        <div className="max-w-[600px] mx-auto p-4">
          {loading? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-4">
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
              className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-12 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <FiInbox size={32} className="text-zinc-400" />
              </div>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                {activeTab === "nearby" &&!userLocation? "Chưa bật định vị" : `Chưa có ${mode === "task"? "task" : "plan"} nào`}
              </p>
              <p className="text-sm text-zinc-500 mb-6">
                {activeTab === "nearby" &&!userLocation? "Bật định vị để khám phá task xung quanh bạn" : "Kéo xuống để làm mới danh sách"}
              </p>
              {activeTab === "nearby" &&!userLocation? (
       <button
  onClick={requestLocation}
  className="px-6 h-11 rounded-xl text-white text-sm font-semibold active:scale-95 transition-all flex items-center gap-2 mx-auto"
  style={{ background: theme[mode].gradient }}
>
  <FiNavigation /> Bật định vị ngay
</button>
              ) : (
         <button
  onClick={handleRefresh}
  disabled={refreshing}
  className="px-6 h-11 rounded-xl text-white text-sm font-semibold active:scale-95 transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
  style={{ background: theme[mode].gradient }}
>
  <FiRefreshCw className={refreshing? "animate-spin" : ""} /> Tải lại
</button>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`${mode}-${activeTab}`}
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
                    transition={{ delay: idx * 0.03 }} // Giảm delay cho mượt
                    layout // THÊM: Animation khi filter/sort
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
<FiRefreshCw className="animate-spin" size={24} style={{ color: theme[mode].primary }} />
            </div>
          )}

     {shareTask && (
  <ShareTaskModal
    task={shareTask}
    onClose={() => setShareTask(null)}
  />
)}

          <div className="h-10" />
        </div>
      </div>

      <style jsx global>{`
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale }
      `}</style>
    </>
  );
}