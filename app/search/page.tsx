"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { TaskListItem } from "@/types/task";
import TaskCard from "@/components/TaskCard";
import { FiSearch, FiX, FiMapPin } from "react-icons/fi";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

type TabId = "hot" | "near" | "friends" | "new";
const PAGE_SIZE = 15;

export default function SearchPage() {
  const db = getFirebaseDB();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>((searchParams.get("tab") as TabId) || "hot");
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [friendIds, setFriendIds] = useState<string[]>([]);

  const locationCache = useRef<{ coords: { lat: number; lng: number }; time: number } | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!user?.uid || activeTab!== "friends" || friendIdsRef.current.length > 0) return;
    const loadFriends = async () => {
      try {
        const snap = await getDocs(query(collection(db, "friends"), where("userId", "==", user.uid), limit(10)));
        const ids = [user.uid,...snap.docs.map((d) => d.data().friendId)];
        friendIdsRef.current = ids;
        setFriendIds(ids);
      } catch { setFriendIds([user.uid]); }
    };
    loadFriends();
  }, [user?.uid, activeTab, db]);

  useEffect(() => {
    if (activeTab!== "near" ||!navigator.geolocation) return;
    const now = Date.now();
    if (locationCache.current && now - locationCache.current.time < 600000) {
      setUserLocation(locationCache.current.coords);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        locationCache.current = { coords, time: now };
      },
      () => toast.error("Không lấy được vị trí"),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
    );
  }, [activeTab]);

  const buildQuery = useCallback((startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
    const base = [where("status", "in", ["open", "full"]), where("visibility", "==", "public"), where("banned", "==", false)];
    if (keyword.trim()) base.push(where("searchKeywords", "array-contains", keyword.toLowerCase().trim()));
    let constraints: any[] = [...base];
    if (activeTab === "hot") { constraints.push(orderBy("likeCount", "desc"), orderBy("createdAt", "desc")); }
    else if (activeTab === "new") { constraints.push(orderBy("createdAt", "desc")); }
    else if (activeTab === "friends" && friendIds.length > 0) { constraints.push(where("userId", "in", friendIds.slice(0, 10)), orderBy("createdAt", "desc")); }
    else { constraints.push(orderBy("createdAt", "desc")); }
    constraints.push(limit(PAGE_SIZE));
    if (startAfterDoc) constraints.push(startAfter(startAfterDoc));
    return query(collection(db, "tasks"),...constraints);
  }, [activeTab, keyword, friendIds, db]);

  const fetchTasks = useCallback(async (reset = false) => {
    if (activeTab === "friends" && friendIds.length === 0 && user) return;
    if (activeTab === "near" &&!userLocation) return;
    reset? setLoading(true) : setLoadingMore(true);
    if (reset) { setTasks([]); setLastDoc(null); setHasMore(true); }
    try {
      const q = buildQuery(reset? undefined : lastDoc || undefined);
      const snap = await getDocs(q);
      let data = snap.docs.map((doc) => ({ id: doc.id,...doc.data() } as TaskListItem));
      if (activeTab === "near" && userLocation) {
        data = data.map((t) => ({...t, distance: t.location?.lat? getDistance(userLocation, { lat: t.location.lat, lng: t.location.lng }) : 9999 }))
         .filter((t: any) => t.distance < 50).sort((a: any, b: any) => a.distance - b.distance);
      }
      setTasks((prev) => {
        if (reset) return data;
        const map = new Map(prev.map((t) => [t.id, t]));
        data.forEach((t) => map.set(t.id, t));
        return Array.from(map.values());
      });
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch { toast.error("Tải dữ liệu thất bại"); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [activeTab, buildQuery, friendIds, userLocation, lastDoc, user]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { fetchTasks(true); }, 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [keyword, activeTab, friendIds, userLocation]);

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
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-24">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
            <div className="relative mb-3">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input
                type="text"
                placeholder="Tìm công việc..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-11 pr-11 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#0042B2]/30 focus:border-[#0042B2] outline-none transition-all"
              />
              {keyword && (
                <button onClick={() => setKeyword("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full">
                  <FiX size={18} className="text-zinc-500" />
                </button>
              )}
            </div>
            <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <motion.button key={tab.id} whileTap={{ scale: 0.97 }} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${active? "bg-white dark:bg-zinc-950 text-[#0042B2] shadow-sm" : "text-zinc-600 dark:text-zinc-400"}`}>
                    <Icon size={18} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          <AnimatePresence mode="wait">
            {loading? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SkeletonList />
              </motion.div>
            ) : tasks.length === 0? (
              <motion.div key="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Empty tab={activeTab} hasKeyword={!!keyword} hasLocation={!!userLocation} />
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {tasks.map((task, idx) => (
                  <motion.div key={task.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                    <TaskCard task={task} mode={task.type} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && hasMore && tasks.length > 0 && (
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => fetchTasks(false)} disabled={loadingMore} className="w-full h-11 rounded-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 font-semibold text-sm active:scale-[0.98] disabled:opacity-50 shadow-sm">
              {loadingMore? <LottiePlayer animationData={loadingPull} loop autoplay className="w-5 h-5 mx-auto" /> : "Tải thêm"}
            </motion.button>
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
        <div key={i} className="bg-white dark:bg-zinc-950 rounded-3xl p-4 animate-pulse border-zinc-200/60 dark:border-zinc-900">
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

function Empty({ tab, hasKeyword, hasLocation }: { tab: TabId; hasKeyword: boolean; hasLocation: boolean }) {
  const messages = {
    hot: hasKeyword? "Không tìm thấy kết quả" : "Chưa có bài hot",
    near:!hasLocation? "Bật GPS để tìm gần bạn" : hasKeyword? "Không có kết quả gần bạn" : "Không có bài gần bạn",
    friends: hasKeyword? "Bạn bè chưa đăng bài này" : "Bạn bè chưa đăng bài",
    new: hasKeyword? "Không tìm thấy kết quả" : "Chưa có bài mới",
  };
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
        <FiSearch size={32} className="text-zinc-400" />
      </div>
      <p className="font-bold text-lg">{messages[tab]}</p>
      <p className="text-sm mt-1 text-zinc-500">Thử từ khóa khác hoặc đổi tab</p>
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