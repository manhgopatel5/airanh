"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWRInfinite from "swr/infinite";
import { useInView } from "react-intersection-observer";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase";
import TaskCard, { TaskCardSkeleton } from "@/components/task/TaskCard";
import { buildFeedApiUrl, mergeFeedPages, type FeedFilters, type FeedPage } from "@/lib/feed";
import type { FeedTask } from "@/types/task";
import { FiSearch, FiX, FiMapPin, FiArrowLeft } from "react-icons/fi";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import { toast, Toaster } from "sonner";

type TabId = "hot" | "near" | "friends" | "new";

const TABS: { id: TabId; label: string; icon: ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "hot", label: "Hot", icon: HiFire },
  { id: "near", label: "Gần bạn", icon: FiMapPin },
  { id: "friends", label: "Bạn bè", icon: HiUsers },
  { id: "new", label: "Mới", icon: HiSparkles },
];

async function fetchWithAuth(url: string): Promise<FeedPage> {
  const auth = getFirebaseAuth().currentUser;
  const headers: HeadersInit = {};
  if (auth) {
    const token = await auth.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Không tải được kết quả");
  return res.json();
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams.get("tab") as TabId) || "hot"
  );
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const locationCache = useRef<{ coords: { lat: number; lng: number }; time: number } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (activeTab !== "near" || !navigator.geolocation) return;

    const now = Date.now();
    if (locationCache.current && now - locationCache.current.time < 10 * 60 * 1000) {
      setUserLocation(locationCache.current.coords);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setLocationDenied(false);
        locationCache.current = { coords, time: now };
      },
      () => {
        setLocationDenied(true);
        toast.error("Bật GPS để tìm việc gần bạn");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }, [activeTab]);

  const filters = useMemo<FeedFilters>(
    () => ({
      category: undefined,
      priceRange: "all",
      deadlineRange: "all",
      sortBy: activeTab === "new" ? "new" : activeTab === "hot" ? "likes" : "new",
      query: debouncedKeyword,
      tab: activeTab,
      lat: userLocation?.lat,
      lng: userLocation?.lng,
      radiusKm: 50,
    }),
    [activeTab, debouncedKeyword, userLocation]
  );

  const filtersKey = JSON.stringify(filters);

  const getKey = useCallback(
    (pageIndex: number, previousPageData: FeedPage | null) => {
      if (activeTab === "near" && !userLocation) return null;
      if (activeTab === "friends" && !user) return null;
      if (previousPageData && !previousPageData.nextCursor) return null;
      const cursor = pageIndex === 0 ? null : previousPageData?.nextCursor ?? null;
      return buildFeedApiUrl("task", filters, cursor);
    },
    [filters, activeTab, userLocation, user]
  );

  const { data, error, isLoading, isValidating, setSize } = useSWRInfinite<FeedPage>(
    getKey,
    fetchWithAuth,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      onError: () => toast.error("Tải dữ liệu thất bại"),
    }
  );

  useEffect(() => {
    setSize(1);
  }, [filtersKey, setSize]);

  const tasks = useMemo(() => (data?.length ? mergeFeedPages(data) : []), [data]);
  const hasMore = !!data?.[data.length - 1]?.nextCursor;

  const { ref: loadMoreRef, inView } = useInView({ rootMargin: "400px 0px" });
  useEffect(() => {
    if (inView && hasMore && !isValidating) setSize((s) => s + 1);
  }, [inView, hasMore, isValidating, setSize]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    params.set("tab", activeTab);
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [keyword, activeTab, router]);

  const handleTaskUpdate = useCallback((id: string, updates: Partial<FeedTask>) => {
    void id;
    void updates;
  }, []);

  const loading =
    isLoading ||
    (activeTab === "near" && !userLocation && !locationDenied) ||
    (activeTab === "friends" && !user);

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-24">
        <div className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
                aria-label="Quay lại"
              >
                <FiArrowLeft size={18} />
              </button>
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="search"
                  placeholder="Tìm công việc, kế hoạch..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => setKeyword("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <FiX size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-around">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center py-2 px-2 flex-1 transition-all ${
                      active
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400 dark:text-zinc-500"
                    }`}
                  >
                    <Icon size={20} className={active ? "scale-110" : ""} />
                    <span className="text-xs font-semibold mt-1">{tab.label}</span>
                    <div
                      className={`mt-1 h-0.5 rounded-full transition-all ${
                        active ? "w-6 bg-blue-600 dark:bg-blue-400" : "w-0"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-3">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <TaskCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && activeTab === "near" && locationDenied && (
            <EmptyState message="Bật GPS để tìm việc gần bạn" hint="Vào cài đặt trình duyệt và cho phép vị trí" />
          )}

          {!loading && activeTab === "friends" && !user && (
            <EmptyState message="Đăng nhập để xem bài của bạn bè" hint="Bạn cần tài khoản để dùng tab này" />
          )}

          {!loading && !error && tasks.length === 0 && !(activeTab === "near" && locationDenied) && (
            <EmptyState
              message={
                debouncedKeyword
                  ? "Không tìm thấy kết quả"
                  : activeTab === "near"
                    ? "Không có việc gần bạn"
                    : activeTab === "friends"
                      ? "Bạn bè chưa đăng bài"
                      : "Chưa có bài phù hợp"
              }
              hint="Thử từ khóa khác hoặc đổi tab"
            />
          )}

          {!loading &&
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                theme={task.type === "task" ? "task" : "plan"}
                currentUserId={user?.uid}
                onTaskUpdate={handleTaskUpdate}
              />
            ))}

          <div ref={loadMoreRef} className="h-4" />
          {isValidating && tasks.length > 0 && (
            <p className="text-center text-sm text-zinc-400 py-2">Đang tải thêm...</p>
          )}
        </div>
      </div>
    </>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="text-center text-gray-400 dark:text-zinc-500 mt-16">
      <div className="text-5xl mb-4">🔍</div>
      <p className="font-semibold text-zinc-700 dark:text-zinc-300">{message}</p>
      <p className="text-sm mt-1">{hint}</p>
    </div>
  );
}
