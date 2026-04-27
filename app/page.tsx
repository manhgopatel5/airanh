"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { getFirebaseDB } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import TaskFeed from "@/components/TaskFeed";
import PlanFeed from "@/components/PlanFeed";
import ModeToggle from "@/components/ModeToggle";
import { AppMode } from "@/types/app";
import { FiMapPin } from "react-icons/fi";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";

const PAGE_SIZE = 15;
type TabId = "hot" | "near" | "friends" | "new";

/* ================= SKELETON ================= */
function SkeletonList() {
  return (
    <div className="space-y-3 px-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 rounded-3xl p-4 animate-pulse border border-gray-100 dark:border-zinc-800"
        >
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
              <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
            <div className="h-20 bg-gray-200 dark:bg-zinc-800 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= MAIN ================= */
export default function Home() {
  const [db, setDb] = useState<any>(null);
  const [mode, setMode] = useState<AppMode>("task");
  const [activeTab, setActiveTab] = useState<TabId>("hot"); // ✅ Thêm tab
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  /* ================= INIT FIREBASE ================= */
  useEffect(() => {
    if (db) return;
    try {
      const _db = getFirebaseDB();
      setDb(_db);
    } catch (err) {
      console.error("Firebase init error:", err);
    }
  }, [db]);

  /* ================= BUILD QUERY ================= */
  const buildQuery = useCallback(
    (startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
      if (!db) return null;
      const constraints: any[] = [
        where("status", "in", ["open", "full"]),
        where("visibility", "==", "public"),
        where("banned", "==", false),
        where("price", mode === "task"? ">" : "==", 0), // Task > 0, Plan = 0
      ];

      // ✅ Logic tab Hot/Near/Friends/New
      if (activeTab === "hot") {
        constraints.push(orderBy("likeCount", "desc"));
        constraints.push(orderBy("createdAt", "desc"));
      } else if (activeTab === "new") {
        constraints.push(orderBy("createdAt", "desc"));
      } else {
        // near/friends tạm thời sort theo time
        constraints.push(orderBy("createdAt", "desc"));
      }

      constraints.push(limit(PAGE_SIZE));
      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }
      return query(collection(db, "tasks"),...constraints);
    },
    [db, mode, activeTab] // ✅ Thêm activeTab
  );

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (!db) return;
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    setLoading(true);
    setTasks([]);
    setLastDoc(null);
    setHasMore(true);
    const q = buildQuery();
    if (!q) return;

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({
          id: doc.id,
     ...doc.data(),
        }));
        setTasks(data);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setTasks([]);
        setHasMore(false);
        setLoading(false);
      }
    );
    unsubRef.current = unsub;
    return () => {
      if (unsub) unsub();
    };
  }, [db, buildQuery]);

  /* ================= LOAD MORE ================= */
  const loadMore = useCallback(async () => {
    if (!db ||!lastDoc || loadingMore ||!hasMore) return;
    setLoadingMore(true);
    try {
      const q = buildQuery(lastDoc);
      if (!q) return;
      const snap = await getDocs(q);
      const newTasks = snap.docs.map((doc) => ({
        id: doc.id,
   ...doc.data(),
      }));
      setTasks((prev) => [...prev,...newTasks]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [db, lastDoc, loadingMore, hasMore, buildQuery]);

  /* ================= TABS CONFIG ================= */
  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "hot", label: "Hot", icon: HiFire },
    { id: "near", label: "Gần bạn", icon: FiMapPin },
    { id: "friends", label: "Bạn bè", icon: HiUsers },
    { id: "new", label: "Mới", icon: HiSparkles },
  ];

  /* ================= UI ================= */
  return (
    <div className="min-h-screen pb-24 font-sans">
      {/* Tầng 1: Task/Plan */}
      <ModeToggle
        mode={mode}
        setMode={setMode}
        taskCount={0}
        planCount={0}
      />

      {/* Tầng 2: Hot/Near/Friends/New */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center py-3 px-2 flex-1 transition-all ${
                    active
                 ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-400 dark:text-zinc-500 hover:text-gray-600"
                  }`}
                >
                  <Icon size={20} className={active? "scale-110" : ""} />
                  <span className="text-xs font-semibold mt-1">{tab.label}</span>
                  <div
                    className={`mt-1 h-0.5 rounded-full transition-all ${
                      active? "w-6 bg-blue-600 dark:bg-blue-400" : "w-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-4">
        {loading && <SkeletonList />}

        {!loading && mode === "task" && <TaskFeed tasks={tasks} />}
        {!loading && mode === "plan" && <PlanFeed plans={tasks} />}

        {!loading && hasMore && tasks.length > 0 && (
          <div className="px-4 mt-3">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className={`w-full py-3 font-bold text-sm rounded-2xl active:scale-95 transition-all disabled:opacity-50 ${
                mode === "task"
             ? "text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20"
                  : "text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20"
              }`}
            >
              {loadingMore? "Đang tải..." : "Tải thêm"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}