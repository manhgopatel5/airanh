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
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
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

  const locationCache = useRef<{ coords: { lat: number; lng: number }; time: number } | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const router = useRouter();

  /* ================= AUTH ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setCurrentUser);
    return () => unsub();
  }, []);

  /* ================= FRIENDS ================= */
  useEffect(() => {
    if (!currentUser?.uid) {
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
  }, [currentUser?.uid]);

  /* ================= GPS ================= */
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

  /* ================= BUILD QUERY ================= */
  const buildQuery = useCallback(
    (startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
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
    [activeTab, friendIds]
  );

  /* ================= FETCH ================= */
  useEffect(() => {
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

    const unsub = onSnapshot(
      q,
      (snap) => {
        let data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TaskListItem[];

        if (activeTab === "near" && userLocation) {
          data = data
            .map((t) => ({
              ...t,
              distance:
                t.location?.lat && t.location?.lng
                  ? getDistance(userLocation, {
                      lat: t.location.lat,
                      lng: t.location.lng,
                    })
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
    if (!lastDoc || loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const q = buildQuery(lastDoc);
      const snap = await getDocs(q);

      let newTasks = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TaskListItem[];

      if (activeTab === "near" && userLocation) {
        newTasks = newTasks
          .map((t) => ({
            ...t,
            distance:
              t.location?.lat && t.location?.lng
                ? getDistance(userLocation, {
                    lat: t.location.lat,
                    lng: t.location.lng,
                  })
                : 9999,
          }))
          .filter((t: any) => t.distance < 50);
      }

      setTasks((prev) => [...prev, ...newTasks]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore, hasMore, buildQuery, activeTab, userLocation]);

  /* ================= TABS ================= */
  const tabs = useMemo(
    () => [
      { id: "hot", label: "Hot", icon: HiFire },
      { id: "near", label: "Gần", icon: HiClock },
      { id: "new", label: "Mới", icon: HiSparkles },
      { id: "friends", label: "Bạn bè", icon: HiUsers },
    ],
    []
  );

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 bg-white border-b">
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}>
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

/* ================= UTILS ================= */
function getDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
) {
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