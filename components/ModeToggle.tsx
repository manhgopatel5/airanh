"use client";

import { useAppStore } from "@/store/app";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function ModeToggle() {
  const { mode, setMode } = useAppStore();
  const isTask = mode === "task";

  const handleSet = (m: "task" | "plan") => {
    if (mode === m) return;
    setMode(m);
    navigator.vibrate?.(8);
  };

  return (
    <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl mt-safe">
      <div className="border-b border-zinc-100 dark:border-zinc-800">
        <div className="relative flex items-center p-1 mx-3 my-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900">
          {/* Sliding pill */}
          <motion.div
            layoutId="mode-pill"
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl shadow-lg"
            style={{
              left: isTask ? 4 : "calc(50% + 0px)",
              background: isTask
                ? "linear-gradient(135deg, #0042B2, #1A5FFF)"
                : "linear-gradient(135deg, #00C853, #00E676)",
              boxShadow: isTask
                ? "0 6px 16px -4px rgba(0,66,178,0.4)"
                : "0 6px 16px -4px rgba(0,200,83,0.4)",
            }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />

          <button
            onClick={() => handleSet("task")}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl font-bold text-sm transition-colors ${
              isTask ? "text-white" : "text-zinc-500 dark:text-zinc-400"
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="w-5 h-5 -ml-0.5">
              <DotLottieReact
                src="/lotties/huha-task-full.lottie"
                autoplay={isTask}
                loop={isTask}
                style={{ width: 20, height: 20 }}
              />
            </div>
            Task
          </button>

          <button
            onClick={() => handleSet("plan")}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl font-bold text-sm transition-colors ${
              !isTask ? "text-white" : "text-zinc-500 dark:text-zinc-400"
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="w-5 h-5 -ml-0.5">
              <DotLottieReact
                src="/lotties/huha-celebrate-full.lottie"
                autoplay={!isTask}
                loop={!isTask}
                style={{ width: 20, height: 20 }}
              />
            </div>
            Plan
          </button>
        </div>
      </div>
    </div>
  );
}