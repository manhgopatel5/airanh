"use client";

import { Task } from "@/types/task";
import TaskCard from "@/components/task/TaskCard"; // ✅ Đổi từ TaskCardRealtime
import EmptyState from "@/components/EmptyState";
import { AppMode } from "@/types/app";

type TabId = "hot" | "near" | "friends" | "new";

type Props = {
  tasks: Task[];
  mode: AppMode;
  activeTab: TabId;
  onShare?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void; // ✅ Thêm
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
/>
        </div>
      ))}
    </div>
  );
}