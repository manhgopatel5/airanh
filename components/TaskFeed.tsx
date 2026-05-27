"use client";

import { FeedTask } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";
import EmptyState from "@/components/EmptyState";
import { AppMode } from "@/types/app";
import { motion, AnimatePresence } from "framer-motion";

type TabId = "hot" | "near" | "friends" | "new";

type Props = {
  tasks: FeedTask[];
  mode: AppMode;
  activeTab: TabId;
  onShare?: (task: FeedTask) => void;
  onDelete?: (id: string) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<FeedTask>) => void;
};

export default function TaskFeed({ tasks, mode, activeTab, onShare, onDelete, onTaskUpdate }: Props) {
  if (tasks.length === 0) {
    return <EmptyState tab={activeTab} type={mode} />;
  }

  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-3 px-4 pt-4 pb-20">
        {tasks.map((task, idx) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              delay: Math.min(idx * 0.03, 0.3), // Max delay 300ms tránh lag
              duration: 0.25,
              ease: [0.25, 0.1, 0.25, 1], // iOS ease
            }}
          >
            <TaskCard
              task={task}
              theme={mode}
              {...(onTaskUpdate && { onTaskUpdate })}
              {...(onShare && { onShare })}
              {...(onDelete && { onDelete })}
            />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}