"use client";

import { useEffect, useState } from "react";
import TaskCard from "@/components/task/TaskCard";
import { TaskCardSkeleton } from "@/components/task/TaskCard";
import type { FeedTask } from "@/types/task";
import { useAuth } from "@/lib/AuthContext";

type Props = {
  taskId?: string;
  taskType?: "task" | "plan";
};

export default function SharedTaskMessage({ taskId, taskType = "task" }: Props) {
  const { user } = useAuth();
  const [task, setTask] = useState<FeedTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch(`/api/tasks/${taskId}`);
        if (!res.ok) throw new Error("not found");
        const data = (await res.json()) as FeedTask;
        if (!cancelled) setTask(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (loading) {
    return (
      <div className="w-[min(100%,320px)]">
        <TaskCardSkeleton />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        Không tải được nội dung đã chia sẻ
      </div>
    );
  }

  const theme = task.type === "plan" ? "plan" : taskType === "plan" ? "plan" : "task";

  return (
    <div className="w-[min(100%,340px)]">
      <TaskCard
        task={task}
        theme={theme}
        currentUserId={user?.uid}
        className="mb-0"
      />
    </div>
  );
}
