"use client";

import { Task } from "@/types/task";
import TaskCardRealtime from "@/components/task/TaskCardRealtime";
import EmptyState from "@/components/EmptyState";
import { AppMode } from "@/types/app";

type TabId = "hot" | "near" | "friends" | "new";

type Props = {
  tasks: Task[];
  mode: AppMode;
  activeTab: TabId;
  onShare?: (task: Task) => void;
  onDelete?: (id: string) => void;
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
<TaskCardRealtime
  initialTask={task}
  theme={mode}
  {...(onShare && { onShare })}
  {...(onDelete && { onDelete })}
/>
        </div>
      ))}
    </div>
  );
}