"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiInbox, FiRefreshCw, FiNavigation } from "react-icons/fi";
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
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import type { Task } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";
import { toast, Toaster } from "sonner";
import { useAppStore } from "@/store/app";
import * as geofire from 'geofire-common';
import CustomFilterBar from "@/components/common/CustomFilterBar";

type TabId = "hot" | "nearby" | "friends" | "new";
type FeedTask = Task & {
  banned?: boolean;
  hidden?: boolean;
};

type TaskWithLocation = FeedTask & {
  location: { lat: number; lng: number };
};

type CacheKey = `${TabId}-${"task" | "plan"}`;

const hasLocation = (task: FeedTask): task is TaskWithLocation => {
  return task.location?.lat!= null && task.location?.lng!= null;
};

const PAGE_SIZE = 50;

const vibrate = (p: number | number[] = 5) => {
  if (typeof navigator!== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(p);
  }
};

export default function TaskFeedPage() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { mode = "task", setMode } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  
  // CACHE THEO TAB + MODE
  const [tasksCache, setTasksCache] = useState<Record<CacheKey, FeedTask[]>>({
    "hot-task": [], "nearby-task": [], "friends-task": [], "new-task": [],
    "hot-plan": [], "nearby-plan": [], "friends-plan": [], "new-plan": [],
  });
  const [lastDocs, setLastDocs] = useState<Record<CacheKey, QueryDocumentSnapshot<DocumentData> | null>>({
    "hot-task": null, "nearby-task": null, "friends-task": null, "new-task": null,
    "hot-plan": null, "nearby-plan": null, "friends-plan": null, "new-plan": null,
  });
  const [hasMoreMap, setHasMoreMap] = useState<Record<CacheKey, boolean>>({
    "hot-task": true, "nearby-task": true, "friends-task": true, "new-task": true,
    "hot-plan": true, "nearby-plan": true, "friends-plan": true, "new-plan": true,
  });
  
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shareTask, setShareTask] = useState<FeedTask | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [searchQueries, setSearchQueries] = useState<Record<TabId, string>>({
    hot: "",
    nearby: "",
    friends: "",
    new: ""
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const theme = {
    task: {
      primary: "#0A84FF",
      gradient: "linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)",
    },
    plan: {
      primary: "#30D158",
      gradient: "linear-gradient(135deg, #30D158 0%, #28B44C 100%)",
    }
  };

  const currentCacheKey: CacheKey = `${activeTab}-${mode}`;
  const tasks = tasksCache[currentCacheKey];
  const hasMore = hasMoreMap[currentCacheKey];

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

    setLoading(true);
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
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const buildQuery = useCallback(
    (startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
      if (!db) return null;
      const now = Timestamp.now();
      const constraints: any[] = [
        where("type", "==", mode),
        where("visibility", "==", "public"),
        where("status", "in", ["open", "full", "doing"]),
        where("deadline", ">", now),
        orderBy("deadline", "asc"),
        limit(PAGE_SIZE),
      ];
      if (startAfterDoc) constraints.push(startAfter(startAfterDoc));
      return query(collection(db, "tasks"),...constraints);
    },
    [db, mode]
  );

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (!db) return;
    const key = currentCacheKey;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const startDoc = isRefresh? undefined : lastDocs[key] || undefined;
      const q = buildQuery(startDoc);
      if (!q) return;

      const snap = await getDocs(q);
      let data = snap.docs.map((doc) => ({
        id: doc.id,
     ...doc.data(),
      })) as FeedTask[];

      setTasksCache(prev => ({
       ...prev, 
        [key]: isRefresh? data : [...prev[key],...data]
      }));
      
      setLastDocs(prev => ({
       ...prev,
        [key]: snap.docs[snap.docs.length - 1] || null
      }));
      
      setHasMoreMap(prev => ({
       ...prev,
        [key]: snap.docs.length === PAGE_SIZE
      }));

    } catch (err: any) {
      console.error("Firestore Fetch Error: ", err);
      if (err.code === "failed-precondition") {
        toast.error("Thiếu index Firestore. Kiểm tra console để tạo.");
      } else if (err.code === "permission-denied") {
        toast.info("Chưa có dữ liệu");
      } else {
        toast.error("Tải dữ liệu thất bại");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [db, buildQuery, lastDocs, currentCacheKey]);

  // LOAD KHI ĐỔI TAB/MODE - CHỈ FETCH NẾU CHƯA CÓ CACHE
  useEffect(() => {
    if (!currentUser) return;
    
    const key = currentCacheKey;
    if (tasksCache[key].length === 0 && hasMoreMap[key]) {
      setLoading(true);
      fetchTasks(true);
    } else {
      setLoading(false);
    }
  }, [mode, activeTab, currentUser]);

  useEffect(() => {
    if (activeTab === "nearby" &&!userLocation) {
      requestLocation();
    }
  }, [activeTab, userLocation, requestLocation]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore &&!loading &&!loadingMore &&!refreshing) {
          fetchTasks(false);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, refreshing, fetchTasks]);



  

  const handleSearchChange = useCallback((filter: TabId, query: string) => {
    setSearchQueries(prev => ({...prev, [filter]: query }));
  }, []);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t =>!t.banned &&!t.hidden);

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
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
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
  }, [tasks, searchQueries, activeTab, userLocation]);

  const handleShare = useCallback((task: FeedTask) => {
    vibrate(5);
    setShareTask(task);
  }, []);

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<FeedTask>) => {
    setTasksCache(prev => ({
     ...prev,
      [currentCacheKey]: prev[currentCacheKey].map(t => 
        t.id === taskId? ({...t,...updates } as FeedTask) : t
      )
    }));
    if (updates.status === "completed") {
      vibrate([10, 20, 10]);
    }
  }, [currentCacheKey]);

  const handleDelete = useCallback((id: string) => {
    setTasksCache(prev => ({
     ...prev,
      [currentCacheKey]: prev[currentCacheKey].filter(t => t.id!== id)
    }));
  }, [currentCacheKey]);

  return (
    <>
      <Toaster richColors position="top-center" />
<div className="h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none">


        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMode("task"); vibrate(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  mode === "task"
                 ? "text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                }`}
                style={mode === "task"? { background: theme.task.gradient } : {}}
              >
                <HiBolt className="w-4 h-4" />
                Task
              </button>
              <button
                onClick={() => { setMode("plan"); vibrate(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  mode === "plan"
                 ? "text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                }`}
                style={mode === "plan"? { background: theme.plan.gradient } : {}}
              >
                <HiCalendarDays className="w-4 h-4" />
                Plan
              </button>
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
    onClick={() => {
      vibrate(10);
      fetchTasks(true);
    }}
    className="px-6 h-11 rounded-xl text-white text-sm font-semibold active:scale-95 transition-all flex items-center gap-2 mx-auto"
style={{ background: theme[mode].gradient }}
  >
    <FiRefreshCw /> Tải lại
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

          {(loadingMore || refreshing) && (
            <div className="flex justify-center py-6">
              <FiRefreshCw className="animate-spin" size={24} style={{ color: theme[mode].primary }} />
            </div>
          )}

          {shareTask && (
            <ShareTaskModal
              task={shareTask as Task}
              onClose={() => setShareTask(null)}
            />
          )}

          <div ref={loadMoreRef} className="h-4" />
        </div>
      </div>

      <style jsx global>{`
     .scrollbar-hide::-webkit-scrollbar { display: none; }
     .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale }
        body { overscroll-behavior-y: contain }
      `}</style>
    </>
  );
}