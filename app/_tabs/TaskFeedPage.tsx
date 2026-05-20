"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAppStore } from "@/store/app";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, startAfter, getDocs, Timestamp, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { motion } from "framer-motion";
import TaskFeed from "@/components/TaskFeed";
import ShareTaskModal from "@/components/ShareTaskModal";
import { Task, TaskItem, PlanItem, isTask, isPlan } from "@/types/task";
import { Sparkles as SparklesIcon, CalendarRange } from "lucide-react";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import { FiMapPin } from "react-icons/fi";
import SkeletonList from "@/components/common/SkeletonList";

const PAGE_SIZE = 20;
type TabId = "hot" | "near" | "friends" | "new";

export default function TaskFeedPage() {
  const [db, setDb] = useState<any>(null);
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  const [allItems, setAllItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [shareTask, setShareTask] = useState<Task | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (db) return;
    try {
      const _db = getFirebaseDB();
      setDb(_db);
    } catch (err) {
      console.error("Firebase init error:", err);
      setLoading(false);
    }
  }, [db]);

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
      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }
      return query(collection(db, "tasks"),...constraints);
    },
    [db, mode]
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!db) return;

      if (allItems.length > 0) {
        setRefreshing(true);
      } else {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
      }

      const q = buildQuery();
      if (!q) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => ({
          id: doc.id,
         ...doc.data(),
        })) as Task[];

        setAllItems(data);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (err: any) {
        console.error("Firestore error:", err.code, err.message);
        if (err.code === "permission-denied") {
          setAllItems([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [db, buildQuery, allItems.length]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMore = useCallback(async () => {
    if (!db ||!lastDoc || loadingMore ||!hasMore) return;
    setLoadingMore(true);
    try {
      const q = buildQuery(lastDoc);
      if (!q) return;
      const snap = await getDocs(q);
      const newItems = snap.docs.map((doc) => ({
        id: doc.id,
       ...doc.data(),
      })) as Task[];
      setAllItems((prev) => [...prev,...newItems]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [db, lastDoc, loadingMore, hasMore, buildQuery]);

  useEffect(() => {
    if (!loadMoreRef.current ||!hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore &&!loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const filteredItems = useMemo(() => {
    let result = [...allItems];
    if (mode === "task") {
      result = result.filter((t) => isTask(t)) as TaskItem[];
    } else {
      result = result.filter((t) => isPlan(t)) as PlanItem[];
    }
    result = result.filter((t) => t.banned!== true && t.hidden!== true);
    if (activeTab === "hot") {
      result.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    }
    return result as Task[];
  }, [allItems, mode, activeTab]);

  const subTabs = [
    { id: "hot" as TabId, label: "Hot", icon: HiFire, color: "orange" },
    { id: "near" as TabId, label: "Gần bạn", icon: FiMapPin, color: "emerald" },
    { id: "friends" as TabId, label: "Bạn bè", icon: HiUsers, color: "blue" },
    { id: "new" as TabId, label: "Mới", icon: HiSparkles, color: "purple" },
  ];

  return (
    <>
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md pt-3 pb-2 px-4 border-b border-gray-100 dark:border-zinc-900">
        <div className="max-w-md mx-auto bg-gray-100 dark:bg-zinc-900 rounded-2xl p-1 flex relative">
          <button
            onClick={() => { setMode("task"); if ("vibrate" in navigator) navigator.vibrate(5); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all relative z-10 ${
              mode === "task"? "text-white shadow" : "text-gray-500 dark:text-zinc-400"
            }`}
          >
            <SparklesIcon size={16} /> Task
            {mode === "task" && (
              <motion.div layoutId="modeSwitchBg" className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl -z-10" />
            )}
          </button>
          <button
            onClick={() => { setMode("plan"); if ("vibrate" in navigator) navigator.vibrate(5); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all relative z-10 ${
              mode === "plan"? "text-white shadow" : "text-gray-500 dark:text-zinc-400"
            }`}
          >
            <CalendarRange size={16} /> Plan
            {mode === "plan" && (
              <motion.div layoutId="modeSwitchBg" className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl -z-10" />
            )}
          </button>
        </div>
      </div>

      <div className="sticky top-[64px] z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-around">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if ("vibrate" in navigator) navigator.vibrate(5);
                  }}
                  className={`flex flex-col items-center py-3 px-2 flex-1 transition-all active:scale-95 ${
                    active? `text-${tab.color}-600 dark:text-${tab.color}-400` : "text-gray-400 dark:text-zinc-500"
                  }`}
                >
                  <Icon size={20} className={active? "scale-110" : ""} />
                  <span className="text-xs font-bold mt-1">{tab.label}</span>
                  <div className={`mt-1 h-0.5 rounded-full transition-all duration-300 ${active? `w-6 bg-${tab.color}-500` : "w-0"}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-4">
        {loading? (
          <SkeletonList />
        ) : (
          <div className={`transition-all duration-200 ${refreshing? "opacity-50 scale-[0.99]" : "opacity-100"}`}>
            <TaskFeed
              tasks={filteredItems}
              mode={mode}
              activeTab={activeTab}
              onShare={(t) => { setShareTask(t); setShowShareModal(true); }}
              onTaskUpdate={(id, up) => setAllItems(prev => prev.map(t => t.id === id? {...t,...up } as Task : t))}
            />
          </div>
        )}

        {!loading && hasMore && allItems.length > 0 && (
          <div ref={loadMoreRef} className="px-4 py-6 flex justify-center">
            {loadingMore && (
              <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}
      </div>

      {showShareModal && shareTask && <ShareTaskModal task={shareTask} onClose={() => setShowShareModal(false)} />}
    </>
  );
}