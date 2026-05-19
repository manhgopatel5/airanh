"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { getFirebaseDB } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  where,
  Timestamp,
  Firestore,
  
Firestore,
type QueryConstraint,
} from "firebase/firestore";

import TaskFeed from "@/components/TaskFeed";
import ModeToggle from "@/components/ModeToggle";
import ShareTaskModal from "@/components/ShareTaskModal";
import LottiePlayer from "@/components/LottiePlayer";
import illustrations from "@/components/illustrations";
import type { Task } from "@/types/task";
import { useAppStore } from "@/store/app";
import type {
  BaseFeedItem,
  TaskListItem,
  PlanListItem,
} from "@/types/task";



import { FiMapPin, FiRefreshCw } from "react-icons/fi";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";

import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
type TabId = "hot" | "near" | "friends" | "new";
type FeedTask = BaseFeedItem &
  Partial<TaskListItem & PlanListItem> & {
    banned?: boolean;
    hidden?: boolean;
    status?: string;
  };
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const vibrate = (p: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(p);
  }
};

export default function Home() {
  const [db, setDb] = useState<Firestore | null>(null);
  const mode = useAppStore((s) => s.mode);
  const isPlanMode = mode === "plan";

  const [activeTab, setActiveTab] = useState<TabId>("hot");
 const [allItems, setAllItems] = useState<FeedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

const [shareTask, setShareTask] =
  useState<FeedTask | null>(null);

const [showShareModal, setShowShareModal] =
  useState(false);

const [showCelebrate, setShowCelebrate] =
  useState(false);

const observerRef =
  useRef<IntersectionObserver | null>(null);

const loadMoreRef =
  useRef<HTMLDivElement>(null);

const pullRef = useRef({
  startY: 0,
  pulling: false,
});

const activeColorClass = useMemo(
  () => (isPlanMode ? "text-accent" : "text-primary"),
  [isPlanMode]
);

const activeBgClass = useMemo(
  () => (isPlanMode ? "bg-accent" : "bg-primary"),
  [isPlanMode]
);

const handleShare = useCallback(
  (task: FeedTask) => {
    vibrate(5);
    setShareTask(task);
    setShowShareModal(true);
  },
  []
);

const handleTaskUpdate = useCallback(
  (
    taskId: string,
    updates: Partial<FeedTask>
  ) => {
    setAllItems((prev) => prev.map((t) => (t.id === taskId? ({...t,...updates } as FeedTask) : t)));
  if (updates.status === "completed") {
      setShowCelebrate(true);
      vibrate([10, 20, 10]);
      setTimeout(() => setShowCelebrate(false), 1800);
    }
  }, []);

  useEffect(() => {
    if (db) return;
    try {
      setDb(getFirebaseDB());
    } catch (err) {
      console.error(err);
      setError("Không thể kết nối database");
      setLoading(false);
    }
  }, [db]);

  const buildQuery = useCallback(
    (startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
      if (!db) return null;
      const now = Timestamp.now();
     const constraints: QueryConstraint[] = [
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

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!db) return;
      isRefresh? setRefreshing(true) : setLoading(true);
      setError(null);
      if (isRefresh) {
        setAllItems([]);
        setLastDoc(null);
        setHasMore(true);
      }
      const q = buildQuery();
      if (!q) return;
      try {
        const snap = await getDocs(q);
       const data = snap.docs.map((doc) => ({
  id: doc.id,
  ...doc.data(),
})) as FeedTask[];
        setAllItems(data);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (err: any) {
        console.error(err);
        if (err.code === "permission-denied") toast.info("Chưa có dữ liệu");
        else if (err.code === "failed-precondition") {
          setError("Thiếu index Firestore");
          toast.error("Cần tạo index cho query");
        } else {
          setError("Lỗi tải dữ liệu");
          toast.error("Không thể tải");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [db, buildQuery]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMore = useCallback(async () => {
   if (!db || !lastDoc || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const q = buildQuery(lastDoc);
      if (!q) return;
      const snap = await getDocs(q);
      const newItems = snap.docs.map((doc) => ({
  id: doc.id,
  ...doc.data(),
})) as FeedTask[];
      setAllItems((prev) => {
  const map = new Map(
    [...prev, ...newItems].map((item) => [
      item.id,
      item,
    ])
  );

  return Array.from(map.values());
});
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [db, lastDoc, loadingMore, hasMore, buildQuery]);

  useEffect(() => {
    if (!loadMoreRef.current ||!hasMore) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
  if (entry?.isIntersecting) {
    loadMore();
  }
},
      { threshold: 0.1, rootMargin: "200px" }
    );
    observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadMore]);

const filteredItems = useMemo(() => {
  let result = allItems.filter(
    (t) => !t.banned && !t.hidden
  );

  if (mode === "task") {
    result = result.filter(
      (t) => t.type === "task"
    );
  } else {
    result = result.filter(
      (t) => t.type === "plan"
    );
  }

  if (activeTab === "hot") {
    result.sort(
      (a, b) =>
        (b.likeCount || 0) -
        (a.likeCount || 0)
    );
  }

  return result;
}, [allItems, mode, activeTab]);

  const handleRefresh = useCallback(() => {
    vibrate(10);
    loadData(true);
  }, [loadData]);

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch && window.scrollY === 0) pullRef.current = { startY: touch.clientY, pulling: true };
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    if (!pullRef.current.pulling) return;
    const dy = (e.touches[0]?.clientY || 0) - pullRef.current.startY;
    if (dy > 80 &&!refreshing) {
      pullRef.current.pulling = false;
      handleRefresh();
    }
  };

  const tabs = useMemo(
    () => [
      { id: "hot" as TabId, label: "Hot", icon: HiFire },
      { id: "near" as TabId, label: "Gần bạn", icon: FiMapPin },
      { id: "friends" as TabId, label: "Bạn bè", icon: HiUsers },
      { id: "new" as TabId, label: "Mới", icon: HiSparkles },
    ],
    []
  );

  return (
    <motion.div
      {...pageVariants}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen pb-24 font-sans bg-background"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      <ModeToggle />

      <AnimatePresence>
        {refreshing && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50"
          >
          <LottiePlayer
  animationData={illustrations.loadingPull}
  autoplay
  loop
  className="w-16 h-16"
  aria-label="Đang làm mới"
/>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCelebrate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
          >
           <LottiePlayer
  animationData={illustrations.celebrate}
  loop={false}
  autoplay
  className="w-[300px] h-[300px]"
  aria-label="Hoàn thành"
/>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    vibrate(5);
                  }}
                  className="flex flex-col items-center py-3 px-2 flex-1 relative transition-all active:scale-95"
                >
                  <Icon
                    size={20}
                    className={cn(active? activeColorClass : "text-muted-foreground")}
                  />
                  <span className={cn("text-xs font-bold mt-1", active? activeColorClass : "text-muted-foreground")}>
                    {tab.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="tab"
                      className={cn("absolute bottom-0 h-0.5 w-8 rounded-full", activeBgClass)}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-4 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {error? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center px-6 py-20 text-center">
             <LottiePlayer animationData={illustrations.errorShake} loop={false} className="w-[180px] h-[180px]" aria-label="Lỗi" />
              <h2 className="text-xl font-bold mt-2 text-foreground">{error}</h2>
              <button
                onClick={handleRefresh}
                className={cn("mt-4 px-6 py-2.5 rounded-xl text-primary-foreground font-bold active:scale-95 flex items-center gap-2", activeBgClass)}
              >
                <FiRefreshCw /> Thử lại
              </button>
            </motion.div>
          ) : loading &&!refreshing? (
            <motion.div key="loading" className="flex flex-col items-center py-20">
             <LottiePlayer animationData={illustrations.loadingPull} loop className="w-[120px] h-[120px]" aria-label="Đang tải" />
              <p className="text-sm text-muted-foreground mt-2">Đang tải...</p>
            </motion.div>
          ) : filteredItems.length === 0? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center px-6 py-16 text-center"
            >
              <LottiePlayer
                animationData={
  isPlanMode
    ? illustrations.walletOpen
    : illustrations.empty
}
                loop
                className="w-[220px] h-[220px]"
                aria-label="Trống"
                fallback={<div className="w-[220px] h-[220px] bg-muted rounded-2xl" />}
              />
              <h3 className="text-lg font-bold mt-2 text-foreground">Chưa có {mode === "task"? "nhiệm vụ" : "kế hoạch"} nào</h3>
              <p className="text-sm text-muted-foreground mb-6">Hãy là người đầu tiên tạo</p>
              <button
                onClick={handleRefresh}
                className={cn("px-6 py-2.5 rounded-xl text-primary-foreground font-bold active:scale-95 flex items-center gap-2", activeBgClass)}
              >
                <FiRefreshCw /> Tải lại
              </button>
            </motion.div>
          ) : (
            <motion.div key="feed">
              <TaskFeed tasks={filteredItems} mode={mode} activeTab={activeTab} onShare={handleShare} onTaskUpdate={handleTaskUpdate} />
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && hasMore && allItems.length > 0 && (
          <div ref={loadMoreRef} className="py-6 flex justify-center">
            {loadingMore && <LottiePlayer
  animationData={illustrations.loadingPull}
  autoplay
  loop
  className="w-16 h-16"
  aria-label="Tải thêm"
/>}
          </div>
        )}
      </div>

{showShareModal && shareTask && (
  <ShareTaskModal
    task={shareTask as Task}
    onClose={() => setShowShareModal(false)}
  />
)}
    </motion.div>
  );
}