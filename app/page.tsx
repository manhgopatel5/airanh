"use client";
export const dynamic = 'force-dynamic';
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
} from "firebase/firestore";
import TaskFeed from "@/components/TaskFeed";
import ModeToggle from "@/components/ModeToggle";
import ShareTaskModal from "@/components/ShareTaskModal";
import { useAppStore } from "@/store/app";
import { Task, TaskItem, PlanItem, isTask, isPlan } from "@/types/task";
import { FiMapPin, FiRefreshCw } from "react-icons/fi";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import { toast } from "sonner";

const PAGE_SIZE = 20;
type TabId = "hot" | "near" | "friends" | "new";

function SkeletonList() {
  return (
    <div className="space-y-3 px-4 animate-in fade-in duration-300">
      {Array.from({ length: 3 }).map((_, i) => (
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
  const mode = useAppStore((s) => s.mode);
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  const [allItems, setAllItems] = useState<Task[]>([]);
  
  // Trạng thái loading thực tế cho lần đầu mở app
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  // Trạng thái fetch ngầm khi người dùng thực hiện chuyển đổi tab/mode
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);
  
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareTask, setShareTask] = useState<Task | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleShare = useCallback((task: Task) => {
    if ("vibrate" in navigator) navigator.vibrate(5);
    setShareTask(task);
    setShowShareModal(true);
  }, []);

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    setAllItems(prev => prev.map(t =>
      t.id === taskId ? ({ ...t, ...updates } as Task) : t
    ));
  }, []);

  // Khởi tạo Database ổn định
  useEffect(() => {
    if (db) return;
    try {
      const _db = getFirebaseDB();
      setDb(_db);
      setError(null);
    } catch (err) {
      console.error("Firebase init error:", err);
      setError("Không thể kết nối database");
      setIsInitialLoading(false);
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
      return query(collection(db, "tasks"), ...constraints);
    },
    [db, mode]
  );

  // ==========================================================================
  // HÀM TẢI DỮ LIỆU ĐƯỢC TỐI ƯU HOÀN HẢO - TRIỆT TIÊU TOÀN BỘ CHỚP & TREO SKELETON
  // ==========================================================================
  const loadData = useCallback(
    async (isManualRefresh = false) => {
      if (!db) return;

      setError(null);

      // Nếu là lần đầu tiên mở app và chưa hề có data, hiển thị Skeleton cứng
      if (allItems.length === 0 && !isManualRefresh) {
        setIsInitialLoading(true);
      } else {
        // Nếu đã có dữ liệu nền, kích hoạt luồng tải ngầm êm ái
        setIsBackgroundFetching(true);
      }

      const q = buildQuery();
      if (!q) {
        setIsInitialLoading(false);
        setIsBackgroundFetching(false);
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
        setError(null);
      } catch (err: any) {
        console.error("Firestore error:", err.code, err.message);
        if (err.code === "permission-denied") {
          setAllItems([]);
          setHasMore(false);
          setError(null);
          toast.info("Chưa có dữ liệu công khai");
        } else if (err.code === "failed-precondition") {
          setError("Yêu cầu thiết lập cấu hình Index");
          toast.error("Vui lòng tạo index trong Firebase Console");
        } else {
          setError("Lỗi đường truyền kết nối");
          toast.error("Không thể cập nhật dữ liệu");
        }
      } finally {
        setIsInitialLoading(false);
        setIsBackgroundFetching(false);
      }
    },
    [db, buildQuery, allItems.length]
  );

  // Lắng nghe thay đổi Mode để đổi dữ liệu mượt mà, không dọn dẹp mảng cũ trước
  useEffect(() => {
    loadData();
  }, [mode]);

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
      })) as Task[];
      setAllItems((prev) => [...prev, ...newItems]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Load more error:", err);
      toast.error("Không thể tải thêm bài viết");
    } finally {
      setLoadingMore(false);
    }
  }, [db, lastDoc, loadingMore, hasMore, buildQuery]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
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
    result = result.filter((t) => t.banned !== true && t.hidden !== true);
    if (activeTab === "hot") {
      result.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    }
    return result as Task[];
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
    <div className="min-h-screen pb-24 font-sans bg-gray-50 dark:bg-black select-none">
      <ModeToggle />
      
      {/* Vạch tiến trình tải dữ liệu ngầm tinh tế ở đỉnh màn hình */}
      {isBackgroundFetching && (
        <div className="fixed top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 animate-pulse z-50" />
      )}

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
                    if (tab.id !== "hot") toast.info("Tính năng đang phát triển");
                  }}
                  className={`flex flex-col items-center py-3 px-2 flex-1 transition-all active:scale-95 ${
                    active ? `text-${tab.color}-600 dark:text-${tab.color}-400` : "text-gray-400 dark:text-zinc-500"
                  }`}
                >
                  <Icon size={20} className={active ? "scale-110 duration-200" : ""} />
                  <span className="text-xs font-bold mt-1">{tab.label}</span>
                  <div className={`mt-1 h-0.5 rounded-full transition-all duration-300 ${active ? `w-6 bg-${tab.color}-500` : "w-0"}`} />
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{error}</h2>
            <button onClick={handleRefresh} className="mt-4 px-6 py-2.5 rounded-xl bg-blue-500 text-white font-bold active:scale-95 transition flex items-center gap-2 shadow-md">
              <FiRefreshCw className={isBackgroundFetching ? "animate-spin" : ""} />
              Thử lại ngay
            </button>
          </div>
        )}

        {/* NÂNG CẤP HOÀN HẢO: Chỉ hiển thị Skeleton đúng lần đầu chạy app. 
            Khi đổi mode, giữ nguyên danh sách cũ mờ nhẹ 40% để chờ data mới đè lên, chặn hoàn toàn hiện tượng nhấp nháy giật cụm */}
        {isInitialLoading ? (
          <SkeletonList />
        ) : (
          <div className={`transition-all duration-300 transform-gpu ${isBackgroundFetching ? "opacity-40 scale-[0.99] pointer-events-none" : "opacity-100 scale-100"}`}>
            <TaskFeed
              tasks={filteredItems}
              mode={mode}
              activeTab={activeTab}
              onShare={handleShare}
              onTaskUpdate={handleTaskUpdate}
            />
          </div>
        )}

        {!isInitialLoading && hasMore && allItems.length > 0 && (
          <div ref={loadMoreRef} className="px-4 py-6 flex justify-center">
            {loadingMore && (
              <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}
      </div>

      {showShareModal && shareTask && (
        <ShareTaskModal task={shareTask} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}
