"use client";
import { HiBolt, HiCalendarDays } from "react-icons/hi2";
import { useAppStore } from "@/store/app";

export default function ModeToggle() {
  const { mode, setMode } = useAppStore();

  return (
    <div className="sticky top-0 z-30 bg-white dark:bg-zinc-950 mt-safe">
      <div className="border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center p-1.5 mx-3 my-2 rounded-2xl bg-gray-100 dark:bg-zinc-800">
          <button
            onClick={() => {
              setMode("task");
              if ("vibrate" in navigator) navigator.vibrate(8);
            }}
            className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
              mode === "task"
               ? "bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg"
                : "text-gray-500 dark:text-zinc-400"
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <HiBolt className="w-4 h-4" />
            Task
          </button>

          <button
            onClick={() => {
              setMode("plan");
              if ("vibrate" in navigator) navigator.vibrate(8);
            }}
            className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
              mode === "plan"
               ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg"
                : "text-gray-500 dark:text-zinc-400"
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <HiCalendarDays className="w-4 h-4" />
            Plan
          </button>
        </div>
      </div>
    </div>
  );
}