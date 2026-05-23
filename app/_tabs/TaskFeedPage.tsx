"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import CustomFilterBar from "@/components/common/CustomFilterBar"; // Dùng file custom riêng

type TabId = "hot" | "near" | "friends" | "new";
type FeedTask = Task & {
  banned?: boolean;
  hidden?: boolean;
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
  const [tasks, setTasks] = useState<FeedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [shareTask, setShareTask] = useState<FeedTask | null>(null);

  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const [radiusKm, setRadiusKm] = useState(5);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

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

  const currentTheme = theme;

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
        setLocationDenied(false);
        vibrate([10, 20, 10]);
        toast.success("Đã xác định vị trí thành công");
      },
      (err) => {
        setLocationDenied(true);
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

    if (isRefresh) {
      setRefreshing(true);
      setLastDoc(null);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const q = buildQuery(isRefresh? undefined : lastDoc || undefined);
      if (!q) return;

      const snap = await getDocs(q);
      let data = snap.docs.map((doc) => ({
        id: doc.id,
      ...doc.data(),
      })) as FeedTask[];

      if (activeTab === "near" && userLocation) {
        data = data.filter(task => {
          if (!task.location?.lat ||!task.location?.lng) return false;
          const distanceInKm = geofire.distanceBetween(
            [userLocation.lat, userLocation.lng],
            [task.location.lat, task.location.lng]
          );
          return distanceInKm <= radiusKm;
        });
      }

      if (isRefresh) {
        setTasks(data);
      } else {
        setTasks(prev => [...prev,...data]);
      }

      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
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
  }, [db, buildQuery, lastDoc, activeTab, userLocation, radiusKm]);

  useEffect(() => {
    if (currentUser) {
      fetchTasks(true);
    }
  }, [mode, activeTab, userLocation, radiusKm, currentUser]);

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

  const handleRefresh = async () => {
    vibrate(10);
    await fetchTasks(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0]?.clientY?? 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current > 0 && window.scrollY === 0) {
      const touchY = e.touches[0]?.clientY;
      if (!touchY) return;
      const distance = touchY - pullStartY.current;
      if (distance > 0) {
        setPullDistance(Math.min(distance, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      handleRefresh();
    }
    pullStartY.current = 0;
    setPullDistance(0);
  };

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t =>!t.banned &&!t.hidden);

    if (searchQuery) {
      result = result.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
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
    } else if (activeTab === "near" && userLocation) {
      result.sort((a, b) => {
        const aLat = a.location?.lat;
        const aLng = a.location?.lng;
        const bLat = b.location?.lat;
        const bLng = b.location?.lng;

        if (aLat == null || aLng == null) return 1;
        if (bLat == null || bLng == null) return -1;

        const distA = geofire.distanceBetween(
          [userLocation.lat, userLocation.lng],
          [aLat, aLng]
        );
        const distB = geofire.distanceBetween(
          [userLocation.lat, userLocation.lng],
          [bLat, bLng]
        );
        return distA - distB;
      });
    }

    return result;
  }, [tasks, searchQuery, activeTab, userLocation]);

  const handleShare = useCallback((task: FeedTask) => {
    vibrate(5);
    setShareTask(task);
  }, []);

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<FeedTask>) => {
    setTasks(prev => prev.map(t => t.id === taskId? ({...t,...updates } as FeedTask) : t));
    if (updates.status === "completed") {
      vibrate([10, 20, 10]);
    }
  }, []);

  return (
    <>
      <Toaster richColors position="top-center" />
      <div
        className="h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {pullDistance > 0 && (
          <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl"
            style={{ height: `${pullDistance}px`, transition: pullDistance === 0? 'height 0.3s' : 'none' }}
          >
            <FiRefreshCw
              className={`${pullDistance > 60? 'animate-spin' : ''}`}
              size={20}
              style={{ color: currentTheme.primary }}
            />
          </div>
        )}

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

          {/* Dùng CustomFilterBar riêng */}
          <CustomFilterBar
            currentFilter={activeTab}
            onChangeFilter={setActiveTab}
            onSearchClick={() => router.push("/search")}
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
                {activeTab === "near" &&!userLocation? "Chưa bật định vị" : `Chưa có ${mode === "task"? "task" : "plan"} nào`}
              </p>
              <p className="text-sm text-zinc-500 mb-6">
                {activeTab === "near" &&!userLocation? "Bật định vị để khám phá task xung quanh bạn" : "Kéo xuống để làm mới danh sách"}
              </p>
              {activeTab === "near" &&!userLocation? (
                <button
                  onClick={requestLocation}
                  className="px-6 h-11 rounded-xl text-white text-sm font-semibold active:scale-95 transition-all flex items-center gap-2 mx-auto"
                  style={{ background: currentTheme.gradient }}
                >
                  <FiNavigation /> Bật định vị ngay
                </button>
              ) : (
                <button
                  onClick={handleRefresh}
                  className="px-6 h-11 rounded-xl text-white text-sm font-semibold active:scale-95 transition-all flex items-center gap-2 mx-auto"
                  style={{ background: currentTheme.gradient }}
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
                      onDelete={(id) => setTasks(prev => prev.filter(t => t.id!== id))}
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
              <FiRefreshCw className="animate-spin" size={24} style={{ color: currentTheme.primary }} />
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