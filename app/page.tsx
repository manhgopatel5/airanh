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
} from "firebase/firestore";

import { useRouter } from "next/navigation";
import { FiPlus } from "react-icons/fi";
import { HiFire, HiClock, HiSparkles, HiUsers } from "react-icons/hi";
import TaskCard from "@/components/TaskCard";

/* ================= TYPES ================= */

type TabId = "hot" | "near" | "new" | "friends";
const PAGE_SIZE = 15;

/* ================= SKELETON ================= */

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

/* ================= MAIN ================= */

export default function Home() {
  const [db, setDb] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<TabId>("hot");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const unsubRef = useRef<(() => void) | null>(null);

  const router = useRouter();

  /* ================= INIT FIREBASE ================= */

  useEffect(() => {
    try {
      const _db = getFirebaseDB();
      const _auth = getFirebaseAuth();

      setDb(_db);
      setAuth(_auth);
    } catch (err) {
      console.error("Firebase init error:", err);
    }
  }, []);


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

      return query(collection(db, "tasks"), ...constraints);
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
        const data = snap.docs
          .map((doc) => {
            if (!doc.exists()) return null;

            return {
              id: doc.id,
              ...doc.data(),
            };
          })
          .filter(Boolean);

        setTasks(data);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setLoading(false);
      }
    );

    unsubRef.current = unsub;

    return () => unsub();
  }, [db, buildQuery]);

  /* ================= LOAD MORE ================= */

  const loadMore = useCallback(async () => {
    if (!db || !lastDoc || loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const q = buildQuery(lastDoc);
      if (!q) return;

      const snap = await getDocs(q);

      const newTasks = snap.docs
        .map((doc) => {
          if (!doc.exists()) return null;

          return {
            id: doc.id,
            ...doc.data(),
          };
        })
        .filter(Boolean);

      setTasks((prev) => [...prev, ...newTasks]);
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
    <div className="min-h-screen pb-24">
      {/* Tabs */}
      <div className="sticky top-0 bg-white border-b">
        <div className="flex justify-around py-2">
          {[
            { id: "hot", label: "Hot", icon: HiFire },
            { id: "near", label: "Gần", icon: HiClock },
            { id: "new", label: "Mới", icon: HiSparkles },
            { id: "friends", label: "Bạn bè", icon: HiUsers },
          ].map((tab) => {
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
                <div>{tab.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3">
        {loading && <SkeletonList />}

        {!loading &&
          Array.isArray(tasks) &&
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}

        {!loading && hasMore && tasks.length > 0 && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-2 text-blue-500"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        )}
      </div>

      {/* Floating button */}
      <button
        onClick={() => router.push("/create")}
        className="fixed bottom-20 right-5 bg-blue-500 text-white p-4 rounded-full shadow-lg"
      >
        <FiPlus size={20} />
      </button>
    </div>
  );
}
