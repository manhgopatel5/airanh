"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { getFirebaseDB } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import TaskFeed from "@/components/TaskFeed";
import ModeToggle from "@/components/ModeToggle";
import { AppMode, Task, TaskItem, PlanItem, TaskListItem, PlanListItem, isTask, isPlan } from "@/types/task";
import { FiMapPin, FiRefreshCw } from "react-icons/fi";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import { toast } from "sonner";

const PAGE_SIZE = 20;
type TabId = "hot" | "near" | "friends" | "new";

function SkeletonList() {
  return (
    <div className="space-y-3 px-4 animate-in fade-in duration-300">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-gray-100 dark:border-zinc-800"
        >
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded w-1/4 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded w-3/4 animate-pulse" />
            <div className="h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded-2xl animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [db, setDb] = useState<any>(null);
  const [mode, setMode] = useState<AppMode>("task");
  const [activeTab, setActiveTab] = useState<TabId>("