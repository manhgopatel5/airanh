"use client";
import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData, onSnapshot } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { TaskListItem } from "@/types/task";
import TaskCard from "@/components/TaskCard";
import { FiSearch, FiX, FiMapPin, FiRefreshCw } from "react-icons/fi";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

type TabId = "hot" | "near" | "friends" | "new";
const PAGE_SIZE = 15;
const LOCATION_CACHE_MS = 10 * 60 * 1000; // 10 phút

type CacheKey = string;
type CacheValue = { tasks: TaskListItem[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean; time: number };
const taskCache = new Map<CacheKey, CacheValue>();

const MemoTaskCard = memo(TaskCard);

export default function SearchPage() {
  const db = getFirebaseDB();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>((searchParams.get("tab") as TabId) || "hot");
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const locationCache = useRef<{ coords: { lat: number; lng: number }; time: number } | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const friendsUnsub = useRef<(() => void) | null>(null);

  // 1. Debounce keyword thông minh
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const delay = debouncedKeyword.length > 2? 300 : 600;
    searchTimeout.current = setTimeout(() => setDebouncedKeyword(keyword), delay);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [keyword, debouncedKeyword.length]);

  // 2. Sync URL chỉ khi debouncedKeyword đổi
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedKeyword) params.set("q", debouncedKeyword);
    params.set("tab", activeTab);
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [debouncedKeyword, activeTab, router]);

  // 3. Realtime friends list
  useEffect(() => {
    if (!user?.uid || activeTab!== "friends") return;
    if (friendsUnsub.current) friendsUnsub.current();
    friendsUnsub.current = onSnapshot(
      query(collection(db, "friends"), where("userId", "==", user.uid)),
      (snap) => {
        const ids = [user.uid,...snap.docs.map((d) => d.data().friendId)];
        setFriendIds(ids);
      },
      () => setFriendIds([user.uid])
    );
    return () => friendsUnsub.current?.();
  }, [user?.uid, activeTab, db]);

  // 4. Location với cache + permission check
  const requestLocation = useCallback(() => {
    if (activeTab!== "near" ||!navigator.geolocation) return;
    const now = Date.now();
    if (locationCache.current && now - locationCache.current.time < LOCATION_CACHE_MS) {
      setUserLocation(locationCache.current.coords);
      setLocationError(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setLocationError(false);
        locationCache.current = { coords, time: now };
      },
      () => {
        setLocationError(true);
        toast.error("Bật GPS để tìm việc gần bạn");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: LOCATION_CACHE_MS }
    );
  }, [activeTab]);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  // 5. Build query với useMemo
  const buildQuery = useMemo(() => {
    return (startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
      const base = [where("status", "in", ["open", "full"]), where("visibility", "==", "public"), where("banned", "==", false)];
      if (debouncedKeyword.trim()) base.push(where("searchKeywords", "array-contains", debouncedKeyword.toLowerCase().trim()));
      let constraints: any[] = [...base];
      if (activeTab === "hot") constraints.push(orderBy("likeCount", "desc"), orderBy("createdAt", "desc"));
      else if (activeTab === "new") constraints.push(orderBy("createdAt", "desc"));
      else if (activeTab === "friends" && friendIds.length > 0) constraints.push(where("userId", "in", friendIds.slice(0, 10)), orderBy("createdAt", "desc"));
      else constraints.push(orderBy("createdAt", "desc"));
      constraints.push(limit(PAGE_SIZE));
      if (startAfterDoc) constraints.push(startAfter(startAfterDoc));
      return query(collection(db, "tasks"),...constraints);
    };
  }, [activeTab, debouncedKeyword, friendIds, db]);

  // 6. Fetch với cache + abort
  const fetchTasks = useCallback(async (reset = false) => {
    const cacheKey = `${activeTab}-${debouncedKeyword}-${userLocation?.lat}-${userLocation?.lng}`;
    if (reset && taskCache.has(cacheKey) && Date.now() - taskCache.get(cacheKey)!.time < 30000) {
      const cached = taskCache.get(cacheKey)!;
      setTasks(cached.tasks);
      setLastDoc(cached.lastDoc);
      setHasMore(cached.hasMore);
      return;
    }

    if (activeTab === "friends" && friendIds.length === 0 && user) return;
    if (activeTab === "near" &&!userLocation) return;

    if (abortController.current) abortController.current.abort();
    abortController.current = new AbortController();

    reset? setLoading(true) : setLoadingMore(true);
    setError(null);
    if (reset) { setTasks([]); setLastDoc(null); setHasMore(true); }

    try {
      const q = buildQuery(reset? undefined : lastDoc || undefined);
      const snap = await getDocs(q);
      let data = snap.docs.map((doc) => ({ id: doc.id,...doc.data() } as TaskListItem));

      if (activeTab === "near" && userLocation) {
        data = data
        .map((t) => ({
  ...t, 
  distance: t.location?.lat && t.location?.lng 
    ? getDistance(userLocation, { lat: t.location.lat, lng: t.location.lng }) 
    : 9999 
}))
         .filter((t: any) => t.distance < 50)
         .sort((a: any, b: any) => a.distance - b.distance);
      }

      const newLastDoc = snap.docs[snap.docs.length - 1] || null;
      const newHasMore = snap.docs.length === PAGE_SIZE;

      setTasks((prev) => {
        if (reset) return data;
        const map = new Map(prev.map((t) => [t.id, t]));
        data.forEach((t) => map.set(t.id, t));
        return Array.from(map.values());
      });
      setLastDoc(newLastDoc);
      setHasMore(newHasMore);

      // Cache 30s
      taskCache.set(cacheKey, { tasks: data, lastDoc: newLastDoc, hasMore: newHasMore, time: Date.now() });
    } catch (err: any) {
      if (err.name!== "AbortError") {
        setError(err.code === "permission-denied"? "Không có quyền truy cập" : "Lỗi mạng, thử lại sau");
        toast.error("Tải dữ liệu thất bại");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeTab, buildQuery, friendIds, userLocation, lastDoc, user]);

  useEffect(() => { fetchTasks(true); }, [debouncedKeyword, activeTab, friendIds, userLocation]);

  // 7. Auto load more với IntersectionObserver
  useEffect(() => {
    if (!loadMoreRef.current ||!hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchTasks(false); },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchTasks]);

  const tabs = useMemo(() => [
    { id: "hot" as TabId, label: "Hot", icon: HiFire },
    { id: "near" as TabId, label: "Gần bạn", icon: FiMapPin },
    { id: "friends" as TabId, label: "Bạn bè", icon: HiUsers },
    { id: "new" as TabId, label: "Mới", icon: HiSparkles },
  ], []);

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-24">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
            <div className="relative mb-3">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input
                type="search"
                placeholder="Tìm công việc..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                enterKeyHint="search"
                className="w-full pl-11 pr-11 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#0042B2]/30 focus:border-[#0042B2] outline-none transition-all"
              />
              {keyword && (
                <button onClick={() => setKeyword("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full" aria-label="Xóa">
                  <FiX size={18} className="text-zinc-500" />
                </button>
              )}
            </div>
            <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl" role="tablist">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    role="tab"
                    aria-selected={active}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${active? "bg-white dark:bg-zinc-950 text-[#0042B2] shadow-sm" : "text-zinc-600 dark:text-zinc-400"}`}
                  >
                    <Icon size={18} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3" role="feed" aria-busy={loading}>
          <AnimatePresence mode="wait">
            {loading? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SkeletonList />
              </motion.div>
            ) : error? (
              <motion.div key="error" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                  <FiRefreshCw size={32} className="text-red-500" />
                </div>
                <p className="font-bold text-lg">{error}</p>
                <button onClick={() => fetchTasks(true)} className="mt-4 px-6 h-11 rounded-2xl bg-[#0042B2] text-white font-semibold active:scale-95">
                  Thử lại
                </button>
              </motion.div>
            ) : tasks.length === 0? (
              <motion.div key="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Empty tab={activeTab} hasKeyword={!!debouncedKeyword} hasLocation={!!userLocation} locationError={locationError} onRetryLocation={requestLocation} />
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {tasks.map((task, idx) => (
                  <motion.div key={task.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                    <MemoTaskCard task={task} mode={task.type} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && hasMore && tasks.length > 0 && (
            <div ref={loadMoreRef} className="py-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => fetchTasks(false)}
                disabled={loadingMore}
                className="w-full h-11 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 font-semibold text-sm active:scale-[0.98] disabled:opacity-50 shadow-sm"
              >
                {loadingMore? <LottiePlayer animationData={loadingPull} loop autoplay className="w-5 h-5 mx-auto" /> : "Tải thêm"}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-950 rounded-3xl p-4 border border-zinc-200/60 dark:border-zinc-900 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
            </div>
          </div>
          <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
          <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function Empty({ tab, hasKeyword, hasLocation, locationError, onRetryLocation }: { tab: TabId; hasKeyword: boolean; hasLocation: boolean; locationError: boolean; onRetryLocation: () => void }) {
  const messages = {
    hot: hasKeyword? "Không tìm thấy kết quả phù hợp" : "Chưa có bài viết nổi bật",
    near: locationError? "Cần bật GPS để tìm việc gần bạn" :!hasLocation? "Đang lấy vị trí..." : hasKeyword? "Không có kết quả gần bạn" : "Chưa có việc nào gần đây",
    friends: hasKeyword? "Bạn bè chưa đăng bài này" : "Bạn bè của bạn chưa đăng việc",
    new: hasKeyword? "Không tìm thấy kết quả" : "Chưa có bài viết mới",
  };
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
        <FiSearch size={32} className="text-zinc-400" />
      </div>
      <p className="font-bold text-lg">{messages[tab]}</p>
      <p className="text-sm mt-1 text-zinc-500">
        {tab === "near" && locationError? (
          <button onClick={onRetryLocation} className="text-[#0042B2] font-semibold">Bật lại GPS</button>
        ) : "Thử từ khóa khác hoặc đổi tab"}
      </p>
    </div>
  );
}

function getDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}