"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  Unsubscribe,
  QueryConstraint,
  limit,
  doc, // ✅ FIX 3
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task } from "@/types/task"; // ✅ FIX 2: Import type chung

/* ================= TYPES ================= */
export type TaskFilter = {
  status?: Task["status"] | Task["status"][];
  userId?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  keyword?: string; // ✅ FIX 6
  limit?: number; // ✅ FIX 4
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // ✅ Memo filter để tránh re-subscribe thừa
  const queryConstraints = useMemo(() => {
    const constraints: QueryConstraint[] = [];
    const limitCount = filter?.limit || 20; // ✅ FIX 4

    // ✅ FIX 1: Nếu filter price thì orderBy price trước
    const hasPriceFilter = filter?.minPrice || filter?.maxPrice;

    if (filter?.status) {
      const statuses = Array.isArray(filter.status)? filter.status : [filter.status];
      constraints.push(where("status", "in", statuses));
    } else {
      constraints.push(where("status", "in", ["open", "full"])); // ✅ FIX 7: Default
    }

    if (filter?.userId) constraints.push(where("userId", "==", filter.userId));
    if (filter?.category) constraints.push(where("category", "==", filter.category));
    if (filter?.keyword) constraints.push(where("searchKeywords", "array-contains", filter.keyword.toLowerCase())); // ✅ FIX 6
    if (filter?.minPrice) constraints.push(where("price", ">=", filter.minPrice));
    if (filter?.maxPrice) constraints.push(where("price", "<=", filter.maxPrice));

    // ✅ FIX 1: OrderBy phải theo field có inequality
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

    const q = query(collection(db, "tasks"),...queryConstraints);

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
  }, [queryConstraints]);

  const loadMore = () => {
    if (!lastDoc ||!hasMore) return;
    // TODO: Dùng startAfter(lastDoc) để load trang tiếp
  };

  return { tasks, loading, error, hasMore, loadMore };
}

/* ================= HOOK 1 TASK ================= */
export function useTask(taskId: string | null) {
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
      doc(db, "tasks", taskId), // ✅ FIX 3: doc đã import
      (snap) => {
        if (snap.exists()) {
          setTask({ id: snap.id,...snap.data() } as Task);
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
  }, [taskId]);

  return { task, loading, error };
}
