"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  QueryConstraint,
  limit,
  doc,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { Task } from "@/types/task";

/* ================= TYPES ================= */
export type TaskFilter = {
  status?: Task["status"] | Task["status"][];
  userId?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  keyword?: string;
  limit?: number;
};

type UseTasksReturn = {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
};

/* ================= HOOK LIST ================= */
export default function useTasks(filter?: TaskFilter): UseTasksReturn {
  const db = getFirebaseDB(); // ✅ FIX 1 (THÊM)

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const queryConstraints = useMemo(() => {
    const constraints: QueryConstraint[] = [];
    const limitCount = filter?.limit || 20;

    const hasPriceFilter = filter?.minPrice || filter?.maxPrice;

    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      constraints.push(where("status", "in", statuses));
    } else {
      constraints.push(where("status", "in", ["open", "full"]));
    }

    if (filter?.userId) constraints.push(where("userId", "==", filter.userId));
    if (filter?.category) constraints.push(where("category", "==", filter.category));
    if (filter?.keyword) constraints.push(where("searchKeywords", "array-contains", filter.keyword.toLowerCase()));
    if (filter?.minPrice) constraints.push(where("price", ">=", filter.minPrice));
    if (filter?.maxPrice) constraints.push(where("price", "<=", filter.maxPrice));

    if (hasPriceFilter) {
      constraints.push(orderBy("price", "asc"));
      constraints.push(orderBy("createdAt", "desc"));
    } else {
      constraints.push(orderBy("createdAt", "desc"));
    }

    constraints.push(limit(limitCount));
    return constraints;
  }, [filter?.status, filter?.userId, filter?.category, filter?.minPrice, filter?.maxPrice, filter?.keyword, filter?.limit]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setTasks([]);
    setLastDoc(null);

    const q = query(collection(db, "tasks"), ...queryConstraints);

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Task));
        setTasks(data);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === (filter?.limit || 20));
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError("Không thể tải danh sách công việc");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [queryConstraints, db]); // ✅ FIX 2 (THÊM db)

  const loadMore = () => {
    if (!lastDoc || !hasMore) return;
  };

  return { tasks, loading, error, hasMore, loadMore };
}

/* ================= HOOK 1 TASK ================= */
export function useTask(taskId: string | null) {
  const db = getFirebaseDB(); // ✅ FIX 3 (THÊM)

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "tasks", taskId),
      (snap) => {
        if (snap.exists()) {
          setTask({ id: snap.id, ...snap.data() } as Task);
          setError(null);
        } else {
          setTask(null);
          setError("Không tìm thấy công việc");
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Lỗi tải công việc");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [taskId, db]); // ✅ FIX 4 (THÊM db)

  return { task, loading, error };
}