"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import TaskCard from "./TaskCard";
import type { Task } from "@/types/task";

type Props = {
  initialTask: Task;
  theme: "task" | "plan";
  onDelete?: (id: string) => void;
  onShare?: (task: Task) => void;
};

export default function TaskCardRealtime({ initialTask, theme, onDelete, onShare }: Props) {
  const [task, setTask] = useState(initialTask);
  const db = getFirebaseDB();

  // ✅ THÊM DÒNG NÀY: Sync khi initialTask đổi từ parent
  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "tasks", initialTask.id), (snap) => {
      if (snap.exists()) {
        setTask({ id: snap.id,...snap.data() } as Task);
      }
    });
    return () => unsub();
  }, [initialTask.id]);

  return (
    <TaskCard 
      task={task} 
      theme={theme} 
      {...(onDelete && { onDelete })} 
      {...(onShare && { onShare })} 
    />
  );
}