"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
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
  QueryConstraint,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { FiPlus } from "react-icons/fi";
import { HiFire, HiClock, HiSparkles, HiUsers } from "react-icons/hi";
import TaskCard from "@/components/TaskCard";
import { TaskListItem } from "@/types/task";

type TabId = "hot" | "near" | "new" | "friends";
const PAGE_SIZE = 15;

export default function Home() {
  const [db, setDb] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<TabId>("hot");
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const locationCache = useRef<{ coords: { lat: number; lng: number }; time: number } | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const router = useRouter();

  // 🔥 INIT FIREBASE (CHỈ CLIENT)
  useEffect(() => {
    try {
      setDb(getFirebaseDB());
      setAuth(getFirebaseAuth());
    } catch (e) {
      console.error("Firebase init error:", e);
    }
  }, []);

  // 🔥 AUTH LISTENER
  useEffect(() => {
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, setCurrentUser);
    return () => unsub();
  }, [auth]);

  // 🔥 FRIEND IDS
  useEffect(() => {
    if (!db || !currentUser?.uid) {
      setFriendIds([]);
      return;
    }

    const unsub = onSnapshot(
      query(
        collection(db, "friends"),
        where("userId", "==", currentUser.uid),
        limit(10)
      ),
      (snap) => {
        const ids = snap.docs.map((d) => d.data().friendId);
        setFriendIds([currentUser.uid, ...ids]);
      }
    );

    return () => unsub();
  }, [db, currentUser?.uid]);

  // 🔥 GEOLOCATION
  useEffect(() => {
    if (activeTab !== "near" || !navigator.geolocation) return;

    const now = Date.now();

    if (locationCache.current && now - locationCache.current.time < 10 * 60 * 1000) {
      setUserLocation(locationCache.current.coords);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        locationCache.current = { coords, time: now };
      },
      () => setUserLocation(null),
      { timeout: 5000 }
    );
  }, [activeTab]);

  // 🔥 BUILD QUERY
  const buildQuery = useCallback(
    (startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
      if (!db) return null;

      const constraints: QueryConstraint[] = [
        where("status", "in", ["open", "full"]),
        where("visibility", "==", "public"),
        where("banned", "==", false),
      ];

      if (activeTab === "hot") {
        constraints.push(orderBy("likeCount", "desc"));
      } else if (activeTab === "new") {
        constraints.push(orderBy("createdAt", "desc"));
      } else if (activeTab === "friends" && friendIds.length > 0) {
        constraints.push(where("userId", "in", friendIds.slice(0, 10)));
        constraints.push(orderBy("createdAt", "desc"));
      } else {
        constraints.push(orderBy("createdAt", "desc"));
      }

      constraints.push(limit(PAGE_SIZE));
      if (startAfterDoc) constraints.push(startAfter(startAfterDoc));

      return query(collection(db, "tasks"), ...constraints);
    },
    [db, activeTab, friendIds]
  );

  // 🔥 LOAD DATA
  useEffect(() => {
    if (!db) return;

    if (unsubRef.current) unsubRef.current();

    setLoading(true);
    setTasks([]);
    setLastDoc(null);
    setHasMore(true);

    if (activeTab === "friends" && friendIds.length === 0 && currentUser) {
      setLoading(false);
      return;
    }

    if (activeTab === "near" && !userLocation) {
      setLoading(false);
      return;
    }

    const q = buildQuery();
    if (!q) return;

    const unsub = onSnapshot(
      q,
      (snap) => {
        let data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TaskListItem[];

        setTasks(data);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
        setLoading(false);
      },
      () => setLoading(false)
    );

    unsubRef.current = unsub;
    return () => unsub();
  }, [db, activeTab, friendIds, userLocation, buildQuery, currentUser]);

  const loadMore = useCallback(async () => {
    if (!db || !lastDoc || loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const q = buildQuery(lastDoc);
      if (!q) return;

      const snap = await getDocs(q);

      const newTasks = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TaskListItem[];

      setTasks((prev) => [...prev, ...newTasks]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [db, lastDoc, loadingMore, hasMore, buildQuery]);

  const tabs = [
    { id: "hot", label: "Hot", icon: HiFire },
    { id: "near", label: "Gần", icon: HiClock },
    { id: "new", label: "Mới", icon: HiSparkles },
    { id: "friends", label: "Bạn bè", icon: HiUsers },
  ];

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 bg-white border-b">
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={
                  activeTab === tab.id
                    ? "text-blue-500 font-bold"
                    : "text-gray-400"
                }
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading && <SkeletonList />}

        {!loading &&
          tasks.map((task) => <TaskCard key={task.id} task={task} />)}

        {!loading && hasMore && tasks.length > 0 && (
          <button onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        )}
      </div>

      <button onClick={() => router.push("/create")}>
        <FiPlus />
      </button>
    </div>
  );
}
function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-3xl p-4 animate-pulse border">
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-20 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
