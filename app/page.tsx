"use client";
export const runtime = "nodejs";
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
import TaskCard from "@/components/TaskCard";
import TopTabs from "@/components/TopTabs";
import EmptyState from "@/components/EmptyState";

/* ================= TYPES ================= */
type TabId = "hot" | "near" | "new" | "friends";
const PAGE_SIZE = 15;

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
  const [activeTab, setActiveTab] = useState<TabId>("hot");
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
      ];
      if (activeTab === "hot") {
        constraints.push(orderBy("likeCount", "desc"));
      } else {
        constraints.push(orderBy("createdAt", "desc"));
      }
      constraints.push(limit(PAGE_SIZE));
      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }
      return query(collection(db, "tasks"),...constraints);
    },
    [db, activeTab]
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

  /* ================= UI ================= */
  return (
    <div className="min-h-screen pb-24 font-sans">
      <TopTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* List */}
      <div className="pt-4 space-y-3">
        {loading && <SkeletonList />}

        {!loading &&
          Array.isArray(tasks) &&
          tasks.map((task) => (
            <div key={task.id} className="px-4">
              <TaskCard task={task} />
            </div>
          ))}

        {!loading && hasMore && tasks.length > 0 && (
          <div className="px-4">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 text-blue-600 dark:text-blue-400 font-bold text-sm rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loadingMore? "Đang tải..." : "Tải thêm"}
            </button>
          </div>
        )}

        {!loading && tasks.length === 0 && <EmptyState tab={activeTab} />}
      </div>
    </div>
  );
}