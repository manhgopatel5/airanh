"use client";

import { FeedTask } from "@/types/task"; // FIX: Task -> FeedTask
import TaskCard from "@/components/task/TaskCard";
import EmptyState from "@/components/EmptyState";
import { AppMode } from "@/types/app";

type TabId = "hot" | "near" | "friends" | "new";

type Props = {
  tasks: FeedTask[]; // FIX: Task[] -> FeedTask[]
  mode: AppMode;
  activeTab: TabId;
  onShare?: (task: FeedTask) => void; // FIX: Task -> FeedTask
  onDelete?: (id: string) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<FeedTask>) => void; // FIX: Task -> FeedTask
};

export default function TaskFeed({ tasks, mode, activeTab, onShare, onDelete, onTaskUpdate }: Props) {
  if (tasks.length === 0) {
    return <EmptyState tab={activeTab} type={mode} />;
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {tasks.map((task, idx) => (
        <div
          key={task.id}
          className="px-4"
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          <TaskCard
            task={task}
            theme={mode}
            {...(onTaskUpdate && { onTaskUpdate })}
            {...(onShare && { onShare })}
            {...(onDelete && { onDelete })}
          />
        </div>
      ))}
    </div>
  );
}