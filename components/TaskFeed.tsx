"use client";

import { Task } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";
import EmptyState from "@/components/EmptyState";
import { AppMode } from "@/types/app";
import { motion, AnimatePresence } from "framer-motion";

type TabId = "hot" | "near" | "friends" | "new";

type Props = {
  tasks: Task[];
  mode: AppMode;
  activeTab: TabId;
  onShare?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.03,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 420, 
      damping: 26,
      mass: 0.7
    } 
  },
  exit: { opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.18 } }
};

export default function TaskFeed({ tasks, mode, activeTab, onShare, onDelete, onTaskUpdate }: Props) {
  if (tasks.length === 0) {
    return <EmptyState tab={activeTab} type={mode} />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-3 pb-6"
    >
      <AnimatePresence mode="popLayout">
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            variants={itemVariants}
            layout
            layoutId={task.id}
            className="px-4"
            whileHover={{y:-1}}
            transition={{type:"spring",stiffness:500,damping:30}}
          >
            <TaskCard
              task={task}
              mode={mode}
              onDelete={onDelete}
              {...(onShare && { 
                onShare: () => onShare(task) 
              })}
              {...(onTaskUpdate && { 
                onTaskUpdate: (updates: Partial<Task>) => onTaskUpdate(task.id, updates) 
              })}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}