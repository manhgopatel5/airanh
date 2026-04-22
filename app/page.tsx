"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  limit,
  startAfter,
  Timestamp,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { FiPlus } from "react-icons/fi";
import { HiFire, HiClock, HiSparkles, HiUsers } from "react-icons/hi";
import TaskCard from "@/components/TaskCard";
import { TaskListItem } from "@/types/task";

type TabId = "hot" | "near" | "new" | "friends";
const PAGE_SIZE = 15;

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const locationCache = useRef<{ coords: any; time: number } | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const router = useRouter();

  /* ================= AUTH + FRIENDS ================= */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, setCurrentUser);
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setFriendIds([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, "friends"), where("userId", "==", currentUser.uid), limit(10)),
      (snap) => {
        const ids = snap.docs.map((d) => d.data().friendId);
        setFriendIds([currentUser.uid,...ids]);
      }
    );
    return () => unsub();
  }, [currentUser?.uid]);

  /* ================= GET GPS - Cache 10 phút ================= */
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
      () => setUserLocation(null),
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

      let constraints: any[] = [...baseConstraints];
      let orderField: string = "createdAt";

      if (activeTab === "hot") {
        orderField = "likeCount";
        constraints.push(orderBy("likeCount", "desc"));
      } else if (activeTab === "new") {
        constraints.push(orderBy("createdAt", "desc"));
      } else if (activeTab === "friends" && friendIds.length > 0) {
        constraints.push(where("userId", "in", friendIds.slice(0, 10)));
        constraints.push(orderBy("createdAt", "desc"));
      } else if (activeTab === "near") {
        // Tạm thời sort createdAt, filter client. Sau này dùng geohash
        constraints.push(orderBy("createdAt", "desc"));
      }

      constraints.push(limit(PAGE_SIZE));
      if (startAfterDoc) constraints.push(startAfter(startAfterDoc));

      return query(collection(db, "tasks"),...constraints);
    },
    [activeTab, friendIds]
  );

  /* ================= FETCH TASKS ================= */
  useEffect(() => {
    // Hủy listener cũ
    if (unsubRef.current) unsubRef.current();

    // Reset state
    setLoading(true);
    setTasks([]);
    setLastDoc(null);
    setHasMore(true);

    // Tab friends chưa có friendIds thì skip
    if (activeTab === "friends" && friendIds.length === 0 && currentUser) {
      setLoading(false);
      return;
    }

    // Tab near chưa có location thì skip
    if (activeTab === "near" &&!userLocation) {
      setLoading(false);
      return;
    }

    const q = buildQuery();
    const unsub = onSnapshot(
      q,
      (snap) => {
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

        setTasks(data);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
        setLoading(false);
      },
      () => setLoading(false)
    );

    unsubRef.current = unsub;
    return () => unsub();
  }, [activeTab, friendIds, userLocation, buildQuery, currentUser]);

  /* ================= LOAD MORE ================= */
  const loadMore = useCallback(async () => {
    if (!lastDoc || loadingMore ||!hasMore) return;
    setLoadingMore(true);

    try {
      const q = buildQuery(lastDoc);
      const snap = await getDocs(q);
      const newTasks = snap.docs.map((doc) => ({ id: doc.id,...doc.data() } as TaskListItem));

      let filtered = newTasks;
      if (activeTab === "near" && userLocation) {
        filtered = newTasks
        .map((t) => ({
           ...t,
            distance:
              t.location?.lat && t.location?.lng
              ? getDistance(userLocation, { lat: t.location.lat, lng: t.location.lng })
                : 9999,
          }))
        .filter((t: any) => t.distance < 50);
      }

      setTasks((prev) => [...prev,...filtered]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore, hasMore, buildQuery, activeTab, userLocation]);

  /* ================= TABS ================= */
  const tabs: { id: TabId; label: string; icon: any }[] = useMemo(
    () => [
      { id: "hot", label: "Hot", icon: HiFire },
      { id: "near", label: "Gần", icon: HiClock },
      { id: "new", label: "Mới", icon: HiSparkles },
      { id: "friends", label: "Bạn bè", icon: HiUsers },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 pb-24">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center py-3 px-2 flex-1 transition-all duration-200 ${
                    active
                    ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-400"
                  }`}
                >
                  <Icon size={22} className={`transition-transform duration-200 ${active? "scale-110" : ""}`} />
                  <span className="text-xs font-semibold mt-1">{tab.label}</span>
                  <div
                    className={`mt-1.5 h-0.5 rounded-full transition-all duration-300 ${
                      active? "w-6 bg-blue-600 dark:bg-blue-400" : "w-0 bg-transparent"
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
        {!loading && tasks.length === 0 && <Empty activeTab={activeTab} hasLocation={!!userLocation} />}
        {!loading && tasks.map((task) => <TaskCard key={task.id} task={task} />)}

        {/* LOAD MORE */}
        {!loading && hasMore && tasks.length > 0 && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loadingMore? "Đang tải..." : "Tải thêm"}
          </button>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push("/create")}
        className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center active:scale-95 transition z-40"
      >
        <FiPlus size={24} />
      </button>
    </div>
  );
}

/* ================= SKELETON ================= */
function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl p-4 animate-pulse border border-gray-100 dark:border-zinc-800">
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

/* ================= EMPTY ================= */
function Empty({ activeTab, hasLocation }: { activeTab: TabId; hasLocation: boolean }) {
  const messages = {
    hot: "Chưa có bài viết hot",
    near: hasLocation? "Không tìm thấy bài viết gần bạn" : "Bật GPS để xem bài viết gần bạn",
    new: "Chưa có bài viết mới",
    friends: "Bạn bè chưa đăng bài viết nào",
  };
  return (
    <div className="text-center text-gray-400 dark:text-zinc-500 mt-20">
      <div className="text-6xl mb-4">📭</div>
      <p className="font-semibold">{messages[activeTab]}</p>
      <p className="text-sm mt-1">Kéo xuống để tải lại</p>
    </div>
  );
}

/* ================= UTILS ================= */
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
