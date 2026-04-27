"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { getFirebaseDB } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import TaskFeed from "@/components/TaskFeed";
import ModeToggle from "@/components/ModeToggle";
import { AppMode, Task, isTask, isPlan } from "@/types/task";
import { FiMapPin, FiRefreshCw } from "react-icons/fi";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import { toast } from "sonner";

const PAGE_SIZE = 20;
type TabId = "hot" | "near" | "friends" | "new";

function SkeletonList() {
  return (
    <div className="space-y-3 px-4 animate-in fade-in duration-300">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-gray-100 dark:border-zinc-800"
        >
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded w-1/4 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded w-3/4 animate-pulse" />
            <div className="h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded-2xl animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [db, setDb] = useState<any>(null);
  const [mode, setMode] = useState<AppMode>("task");
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  const [allItems, setAllItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (db) return;
    try {
      const _db = getFirebaseDB();
      setDb(_db);
      setError(null);
    } catch (err) {
      console.error("Firebase init error:", err);
      setError("Không thể kết nối database");
      setLoading(false);
    }
  }, [db]);

  const buildQuery = useCallback(
    (startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
      if (!db) return null;
      const constraints: any[] = [
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE),
      ];
      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }
      return query(collection(db, "tasks"),...constraints);
    },
    [db]
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!db) return;
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setAllItems([]);
      setLastDoc(null);
      setHasMore(true);

      const q = buildQuery();
      if (!q) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const unsub = onSnapshot(
        q,
        (snap) => {
          console.log("Firestore success, docs:", snap.docs.length);
          const data = snap.docs.map((doc) => ({
            id: doc.id,
      ...doc.data(),
          })) as Task[];
          setAllItems(data);
          setLastDoc(snap.docs[snap.docs.length - 1] || null);
          setHasMore(snap.docs.length === PAGE_SIZE);
          setLoading(false);
          setRefreshing(false);
          setError(null);
        },
        (err) => {
          console.error("Firestore error:", err.code, err.message);
          if (err.code === "permission-denied") {
            console.warn("Permission denied, showing empty state");
            setAllItems([]);
            setHasMore(false);
            setError(null);
            toast.info("Chưa có dữ liệu");
          } else if (err.code === "failed-precondition") {
            setError("Thiếu index database");
            toast.error("Tạo index trong Firebase Console");
          } else {
            setError("Lỗi tải dữ liệu");
            toast.error("Không thể tải dữ liệu");
          }
          setLoading(false);
          setRefreshing(false);
        }
      );
      unsubRef.current = unsub;
    },
    [db, buildQuery]
  );

  useEffect(() => {
    loadData();
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
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
      toast.error("Không thể tải thêm");
    } finally {
      setLoadingMore(false);
    }
  }, [db, lastDoc, loadingMore, hasMore, buildQuery]);

  useEffect(() => {
    if (!loadMoreRef.current || loading ||!hasMore) return;
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
  }, [loading, hasMore, loadingMore, loadMore]);

  const filteredItems = useMemo(() => {
    let result = [...allItems];

    // 1. Filter theo type - FIX CHÍNH
    result = result.filter((t) => t.type === mode);

    // 2. Filter chung
    result = result.filter(
      (t) =>
        (t.status === "open" || t.status === "full") &&
        t.visibility!== "private" &&
        t.banned!== true
    );

    // 3. Sort theo tab
    if (activeTab === "hot") {
      result.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    } else if (activeTab === "new") {
      // Đã orderBy createdAt desc từ query
    } else if (activeTab === "near") {
      // TODO: geolocation
      result = [];
    } else if (activeTab === "friends") {
      // TODO: following list
      result = [];
    }

    return result;
  }, [allItems, mode, activeTab]);

  const handleRefresh = () => {
    if ("vibrate" in navigator) navigator.vibrate(10);
    loadData(true);
  };

  const tabs: { id: TabId; label: string; icon: any; color: string }[] = [
    { id: "hot", label: "Hot", icon: HiFire, color: "orange" },
    { id: "near", label: "Gần bạn", icon: FiMapPin, color: "emerald" },
    { id: "friends", label: "Bạn bè", icon: HiUsers, color: "blue" },
    { id: "new", label: "Mới", icon: HiSparkles, color: "purple" },
  ];

  return (
    <div className="min-h-screen pb-24 font-sans bg-gray-50 dark:bg-black">
      <ModeToggle mode={mode} setMode={setMode} />

      <div className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800">
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
                    if ("vibrate" in navigator) navigator.vibrate(5);
                  }}
                  className={`flex flex-col items-center py-3 px-2 flex-1 transition-all active:scale-95 ${
                    active
                ? `text-${tab.color}-600 dark:text-${tab.color}-400`
                      : "text-gray-400 dark:text-zinc-500"
                  }`}
                >
                  <Icon size={20} className={active? "scale-110" : ""} />
                  <span className="text-xs font-bold mt-1">{tab.label}</span>
                  <div
                    className={`mt-1 h-0.5 rounded-full transition-all duration-300 ${
                      active? `w-6 bg-${tab.color}-500` : "w-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-4">
        {error && (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {error}
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
              Mở Console F12 để xem lỗi chi tiết
            </p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-6 py-2.5 rounded-xl bg-blue-500 text-white font-bold active:scale-95 transition flex items-center gap-2"
            >
              <FiRefreshCw className={refreshing? "animate-spin" : ""} />
              Thử lại
            </button>
          </div>
        )}

        {loading && <SkeletonList />}

        {!loading &&!error && (
          <TaskFeed tasks={filteredItems} mode={mode} activeTab={activeTab} />
        )}

        {!loading && hasMore && allItems.length > 0 && (
          <div ref={loadMoreRef} className="px-4 py-6 flex justify-center">
            {loadingMore && (
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}