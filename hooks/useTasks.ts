"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function useTasks() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const now = new Date(); // 🔥 thời gian hiện tại

    const q = query(
      collection(db, "tasks"),
      where("deadline", ">", now), // 🔥 lọc task chưa hết hạn
      orderBy("deadline", "asc") // 🔥 task sắp hết hạn lên đầu
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTasks(data);
    });

    return () => unsub();
  }, []);

  return tasks;
}
