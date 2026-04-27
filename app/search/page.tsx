"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { QueryConstraint } from "firebase/firestore";
import { TaskListItem, isTask } from "@/types/task";
import TaskCard from "@/components/TaskCard";
import { FiSearch, FiX, FiMapPin } from "react-icons/fi";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import { toast, Toaster } from "sonner";

type TabId = "hot" | "near" | "friends" | "new";
const PAGE_SIZE = 15;

export default function SearchPage() {
  const db = getFirebaseDB();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams.get("tab") as TabId) || "hot"
  );
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [friendIds, setFriendIds] = useState<string[]>([]);

  const locationCache = useRef<{
    coords: { lat: number; lng: number };
    time: number;
  } | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendIdsRef = useRef<string[]>([]);

  /* ================= GET FRIENDS ================= */
  useEffect(() => {
    if (!user?.uid || activeTab!== "friends" || friendIdsRef.current.length > 0) return;

    const loadFriends = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "friends"), where("userId", "==", user.uid), limit(10))
        );
        const ids = [user.uid,...snap.docs.map((d) => d.data().friendId)];
        friendIdsRef.current = ids;
        setFriendIds(ids);
      } catch (e) {
        console.error("Load friends error:", e);
        setFriendIds([user.uid]);
      }
    };
    loadFriends();
  }, [user?.uid, activeTab]);

  /* ================= GET GPS ================= */
  useEffect(() => {
    if (activeTab!== "near" ||!navigator.geolocation) return;

    const now = Date.now();
    if (locationCache.current && now - locationCache.current.time < 10 * 60 * 1000) {
      setUserLocation(locationCache.current.coords);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        locationCache.current = { coords, time: now };
      },
      (err) => {
        console.error("GPS error:", err);
        toast.error("Không lấy được vị trí. Bật GPS và thử lại");
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
    );
  }, [activeTab]);

  /* ================= BUILD QUERY ================= */
  const buildQuery = useCallback(
    (startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
      const baseConstraints = [
        where("status", "in", ["open", "full"]),
        where("visibility", "==", "public"),
        where("banned", "==", false),
      ];

      if (keyword.trim()) {
        baseConstraints.push(where("searchKeywords", "array-contains", keyword.toLowerCase().trim()));
      }

      let constraints: QueryConstraint[] = [...baseConstraints];

      if (activeTab === "hot") {
        constraints.push(orderBy("likeCount", "desc"));
        constraints.push(orderBy("createdAt", "desc"));
      } else if (activeTab === "new") {
        constraints.push(orderBy("createdAt", "desc"));
      } else if (activeTab === "friends" && friendIds.length > 0) {
        constraints.push(where("userId", "in", friendIds.slice(0, 10)));
        constraints.push(orderBy("createdAt", "desc"));
      } else if (activeTab === "near") {
        constraints.push(orderBy("createdAt", "desc"));
      }

      constraints.push(limit(PAGE_SIZE));
      if (startAfterDoc) constraints.push(startAfter(startAfterDoc));

      return query(collection(db, "tasks"),...constraints);
    },
    [activeTab, keyword, friendIds]
  );

  /* ================= FETCH ================= */
  const fetchTasks = useCallback(
    async (reset = false) => {
      if (activeTab === "friends" && friendIds.length === 0 && user) return;
      if (activeTab === "near" &&!userLocation) return;

      reset? setLoading(true) : setLoadingMore(true);
      if (reset) {
        setTasks([]);
        setLastDoc(null);
        setHasMore(true);
      }

      try {
        const q = buildQuery(reset? undefined : lastDoc || undefined);
        const snap = await getDocs(q);
        let data = snap.docs.map((doc) => ({ id: doc.id,...doc.data() } as TaskListItem));

        // Tab near: filter client theo khoảng cách
        if (activeTab === "near" && userLocation) {
          data = data
           .map((t) => ({
             ...t,
              distance:
                t.location?.lat && t.location?.lng
                 ? getDistance(userLocation, { lat: t.location.lat, lng: t.location.lng })
                  : 9999,
            }))
           .filter((t: any) => t.distance < 50)
           .sort((a: any, b: any) => a.distance - b.distance);
        }

        // Tránh duplicate key khi loadMore
        setTasks((prev) => {
          if (reset) return data;
          const map = new Map(prev.map((t) => [t.id, t]));
          data.forEach((t) => map.set(t.id, t));
          return Array.from(map.values());
        });

        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error(err);
        toast.error("Tải dữ liệu thất bại");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab, buildQuery, friendIds, userLocation, lastDoc, user]
  );

  /* ================= SEARCH DEBOUNCE ================= */
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchTasks(true);
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [keyword, activeTab, friendIds, userLocation]);

  /* ================= UPDATE URL ================= */
  useEffect(() => {
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    params.set("tab", activeTab);
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [keyword, activeTab, router]);

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "hot", label: "Hot", icon: HiFire },
    { id: "near", label: "Gần bạn", icon: FiMapPin },
    { id: "friends", label: "Bạn bè", icon: HiUsers },
    { id: "new", label: "Mới", icon: HiSparkles },
  ];

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-24">
        {/* HEADER */}
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800">
          <div className="max-w-2xl mx-auto px-4 py-3">
            {/* Search Input */}
            <div className="relative mb-3">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Tìm công việc..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {keyword && (
                <button
                  onClick={() => setKeyword("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX size={20} />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex justify-around">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center py-2 px-2 flex-1 transition-all ${
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

        {/* CONTENT */}
        <div className="max-w-2xl mx-auto p-4 space-y-3">
          {loading && <SkeletonList />}
          {!loading && tasks.length === 0 && (
            <Empty tab={activeTab} hasKeyword={!!keyword} hasLocation={!!userLocation} />
          )}
          {!loading && tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              mode={isTask(task)? "task" : "plan"}
            />
          ))}

          {/* LOAD MORE */}
          {!loading && hasMore && tasks.length > 0 && (
            <button
              onClick={() => fetchTasks(false)}
              disabled={loadingMore}
              className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loadingMore? "Đang tải..." : "Tải thêm"}
            </button>
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
        <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl p-4 animate-pulse border border-gray-100 dark:border-zinc-800">
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
            </div>
          </div>
          <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
          <div className="h-20 bg-gray-200 dark:bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}

function Empty({ tab, hasKeyword, hasLocation }: { tab: TabId; hasKeyword: boolean; hasLocation: boolean }) {
  const messages = {
    hot: hasKeyword? "Không tìm thấy kết quả" : "Chưa có bài hot",
    near:!hasLocation? "Bật GPS để tìm gần bạn" : hasKeyword? "Không có kết quả gần bạn" : "Không có bài gần bạn",
    friends: hasKeyword? "Bạn bè chưa đăng bài này" : "Bạn bè chưa đăng bài",
    new: hasKeyword? "Không tìm thấy kết quả" : "Chưa có bài mới",
  };
  return (
    <div className="text-center text-gray-400 dark:text-zinc-500 mt-20">
      <div className="text-6xl mb-4">🔍</div>
      <p className="font-semibold">{messages[tab]}</p>
      <p className="text-sm mt-1">Thử từ khóa khác hoặc đổi tab</p>
    </div>
  );
}

function getDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}