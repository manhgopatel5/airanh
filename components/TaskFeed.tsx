"use client";

import { TaskListItem, PlanListItem } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";
import EmptyState from "@/components/EmptyState";
import { AppMode } from "@/types/app";

type TabId = "hot" | "near" | "friends" | "new";

type Props = {
  tasks: (TaskListItem | PlanListItem)[];
  mode: AppMode;
  activeTab: TabId;
  onShare?: (task: TaskListItem | PlanListItem) => void; // ← THÊM
  onDelete?: (id: string) => void; // ← THÊM nếu cần
};

export default function TaskFeed({ tasks, mode, activeTab, onShare, onDelete }: Props) {
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
  {...(onShare && { onShare })}
  {...(onDelete && { onDelete })}
/>
        </div>
      ))}
    </div>
  );
}