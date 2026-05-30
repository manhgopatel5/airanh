"use client";

import { motion } from "framer-motion";

export default function ProgressBar({ step, total }: { step: number; total: number }) {
  const percent = (step / total) * 100;
  
  return (
    <div className="mb-8">
      <div className="mb-2 flex justify-between text-xs font-black text-zinc-500 dark:text-zinc-400">
        <span>Bước {step}/{total}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-[#0A84FF] to-[#0051D5]"
        />
      </div>
    </div>
  );
}