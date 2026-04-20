"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function useTasks() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    try {
      const q = query(
        collection(db, "tasks"),
        orderBy("createdAt", "desc") // ✅ đơn giản, không lỗi
      );

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setTasks(data);
        },
        (error) => {
          console.error("🔥 Firestore error:", error);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error("🔥 Hook crash:", err);
    }
  }, []);

  return tasks;
}