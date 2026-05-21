"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiInbox, FiSearch, FiRefreshCw, FiX, FiMapPin, FiNavigation, FiTarget } from "react-icons/fi";
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
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import * as geofire from 'geofire-common';

type TabId = "hot" | "near" | "friends" | "new";
type FeedTask = Task & {
  banned?: boolean;
  hidden?: boolean;
};

const SUB_TABS: { key: TabId; label: string; icon: any }[] = [
  { key: "hot", label: "Hot", icon: HiFire },
  { key: "near", label: "Gần bạn", icon: FiMapPin },
  { key: "friends", label: "Bạn bè", icon: HiUsers },
  { key: "new", label: "Mới", icon: HiSparkles },
];

const PAGE_SIZE = 20;
const RADIUS_OPTIONS = [1, 2, 5, 10, 20, 50];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [shareTask, setShareTask] = useState<FeedTask | null>(null);
  const [tabChanged, setTabChanged] = useState(false);
  const [prevTab, setPrevTab] = useState<TabId>("hot");

  // Location states
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  const theme = {
    task: {
      primary: "#0A84FF",
      gradient: "from-[#0A84FF] to-[#0066CC]",
      text: "text-[#0A84FF]",
      shadow: "shadow-[0_8px_30px_rgba(10,132,255,0.3)]",
    },
    plan: {
      primary: "#30D158",
      gradient: "from-[#30D158] to-[#28B44C]",
      text: "text-[#30D158]",
      shadow: "shadow-[0_8px_30px_rgba(48,209,88,0.3)]",
    }
  };

  const currentTheme = theme[mode];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) router.push("/login");
    });
    return () => unsub();
  }, [auth, router]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationDenied(false);
        setShowLocationModal(false);
        vibrate([10, 20, 10]);
        toast.success("Đã lấy vị trí của bạn");
        setLoading(false);
      },
      (err) => {
        setLocationDenied(true);
        setShowLocationModal(true);
        if (err.code === 1) toast.error("Bạn đã từ chối quyền định vị");
        else toast.error("Không lấy được vị trí");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleTabClick = (tab: TabId) => {
    vibrate(5);
    setActiveTab(tab);
    if (tab === "near" &&!userLocation &&!locationDenied) {
      setShowLocationModal(true);
    }
  };

  const buildQuery = useCallback(
    (startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
      if (!db) return null;
      const now = Timestamp.now();
      const constraints: any[] = [
        where("type", "==", mode),
        where("visibility", "==", "public"),
        where("status", "in", ["open", "full", "doing"]),
        where("deadline", ">", now),
      ];

      if (activeTab === "near" && userLocation) {
        const center: [number, number] = [userLocation.lat, userLocation.lng];
        const radiusInM = radiusKm * 1000;
        const bounds = geofire.geohashQueryBounds(center, radiusInM);
        const [start, end] = bounds[0];
        constraints.push(
          where("geohash", ">=", start),
          where("geohash", "<=", end),
          orderBy("geohash")
        );
      } else {
        constraints.push(orderBy("deadline", "asc"));
      }

      constraints.push(limit(PAGE_SIZE));
      if (startAfterDoc) constraints.push(startAfter(startAfterDoc));
      return query(collection(db, "tasks"),...constraints);
    },
    [db, mode, activeTab, userLocation, radiusKm]
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

      // Filter theo khoảng cách chính xác nếu là tab near
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
    if (prevTab!== activeTab) {
      setTabChanged(true);
      vibrate([10, 30, 10]);
      setPrevTab(activeTab);
    }
  }, [activeTab, prevTab]);

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
        const distA = geofire.distanceBetween(
          [userLocation.lat, userLocation.lng],
          [a.location?.lat || 0, a.location?.lng || 0]
        );
        const distB = geofire.distanceBetween(
          [userLocation.lat, userLocation.lng],
          [b.location?.lat || 0, b.location?.lng || 0]
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
        className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {pullDistance > 0 && (
          <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl"
            style={{ height: `${pullDistance}px`, transition: pullDistance === 0? 'height 0.3s' : 'none' }}
          >
            <FiRefreshCw className={`${pullDistance > 60? 'animate-spin' : ''} text-[#0A84FF]`} size={20} />
          </div>
        )}

        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <button
                onClick={() => { setMode("task"); vibrate(); }}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  mode === "task"? `bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm` : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <HiBolt className="w-4 h-4" />
                Task
              </button>
              <button
                onClick={() => { setMode("plan"); vibrate(); }}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  mode === "plan"? `bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm` : "text-zinc-500 dark:text-zinc-400"
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
                {SUB_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.key}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTabClick(tab.key)}
                      className={`px-4 h-9 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        activeTab === tab.key
                         ? mode === "task"
                           ? "bg-[#0A84FF] text-white"
                            : "bg-[#30D158] text-white"
                          : tabChanged
                           ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 opacity-40"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                      {tab.key === "near" && activeTab === "near" && userLocation && (
                        <span className="text-xs opacity-80">{radiusKm}km</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  vibrate();
                  setShowSearch(!showSearch);
                  setTabChanged(false);
                }}
                className={`p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 active:scale-90 transition-all relative ${
                  tabChanged
                   ? mode === "task"
                     ? "ring-2 ring-[#0A84FF] shadow-[0_0_20px_rgba(10,132,255,0.6)]"
                      : "ring-2 ring-[#30D158] shadow-[0_0_20px_rgba(48,209,88,0.6)]"
                    : ""
                }`}
              >
                <FiSearch
                  size={18}
                  onAnimationEnd={() => setTabChanged(false)}
                  style={{
                    animation: tabChanged? 'scale 0.6s ease-in-out 5' : 'none'
                  }}
                  className={`${
                    tabChanged
                     ? mode === "task"? "text-[#0A84FF]" : "text-[#30D158]"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                />
              </button>
            </div>

            <AnimatePresence>
              {activeTab === "near" && userLocation && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-3"
                >
                  <button
                    onClick={() => setShowRadiusPicker(true)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-medium active:scale-98 transition-all"
                  >
                    <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                      <FiTarget size={16} />
                      Bán kính tìm kiếm
                    </div>
                    <div className={`font-bold ${currentTheme.text}`}>{radiusKm} km</div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Tìm ${mode}...`}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none text-sm focus:ring-2 focus:ring-[#0A84FF]/20"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <FiX size={16} className="text-zinc-500" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
          ) : filteredTasks.length === 0? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 p-12 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <FiInbox size={32} className="text-zinc-400" />
              </div>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                {activeTab === "near" &&!userLocation? "Cần bật định vị" : `Chưa có ${mode === "task"? "task" : "plan"} nào`}
              </p>
              <p className="text-sm text-zinc-500 mb-6">
                {activeTab === "near" &&!userLocation? "Cho phép truy cập vị trí để tìm task gần bạn" : "Kéo xuống để tải lại"}
              </p>
              {activeTab === "near" &&!userLocation? (
                <button
                  onClick={() => setShowLocationModal(true)}
                  className={`px-6 h-11 rounded-xl bg-gradient-to-r ${currentTheme.gradient} text-white text-sm font-semibold active:scale-95 transition-all ${currentTheme.shadow} flex items-center gap-2 mx-auto`}
                >
                  <FiNavigation /> Bật định vị
                </button>
              ) : (
                <button
                  onClick={handleRefresh}
                  className={`px-6 h-11 rounded-xl bg-gradient-to-r ${currentTheme.gradient} text-white text-sm font-semibold active:scale-95 transition-all ${currentTheme.shadow} flex items-center gap-2 mx-auto`}
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
              <FiRefreshCw className="animate-spin text-[#0A84FF]" size={24} />
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

      {/* Modal xin quyền location */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setShowLocationModal(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[400px] bg-white dark:bg-zinc-900 rounded-3xl p-6"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#0A84FF] to-[#0066CC] flex items-center justify-center">
                <FiNavigation size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Bật định vị</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
                Cho phép truy cập vị trí để tìm task gần bạn nhất
              </p>
              <button
                onClick={requestLocation}
                className={`w-full h-12 rounded-xl bg-gradient-to-r ${currentTheme.gradient} text-white font-semibold active:scale-95 transition-all ${currentTheme.shadow}`}
              >
                Cho phép định vị
              </button>
              <button
                onClick={() => setShowLocationModal(false)}
                className="w-full h-12 mt-2 rounded-xl text-zinc-500 font-semibold active:scale-95"
              >
                Để sau
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal chọn bán kính */}
      <AnimatePresence>
        {showRadiusPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setShowRadiusPicker(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[400px] bg-white dark:bg-zinc-900 rounded-3xl p-6"
            >
              <h3 className="text-lg font-bold mb-4">Chọn bán kính</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {RADIUS_OPTIONS.map((km) => (
                  <button
                    key={km}
                    onClick={() => {
                      setRadiusKm(km);
                      setShowRadiusPicker(false);
                      vibrate(5);
                      fetchTasks(true);
                    }}
                    className={`h-11 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                      radiusKm === km
                       ? `bg-gradient-to-r ${currentTheme.gradient} text-white ${currentTheme.shadow}`
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {km} km
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
       .scrollbar-hide::-webkit-scrollbar { display: none; }
       .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale }
        body { overscroll-behavior-y: contain }

        @keyframes scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.25); }
        }
      `}</style>
    </>
  );
}