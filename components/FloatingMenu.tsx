"use client";
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from "framer-motion";
import { Sparkles, CalendarRange } from "lucide-react";

const SPRING = {
  type: "spring" as const,
  stiffness: 550,
  damping: 32,
  mass: 0.8
};

const SPRING_BOUNCY = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
  mass: 0.6
};

interface FloatingMenuProps {
  isOpen: boolean;
  onSelect: (type: "task" | "plan") => void;
  onClose: () => void;
}

export default function FloatingMenu({ isOpen, onSelect, onClose }: FloatingMenuProps) {
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 100], [1, 0]);
  const scale = useTransform(y, [0, 100], [1, 0.95]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.y > 80 || info.velocity.y > 500) onClose();
          }}
          style={{ y, opacity, scale }}
          initial={{ opacity: 0, y: 20, scale: 0.96, filter: "blur(8px)" }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            transition: SPRING_BOUNCY
          }}
          exit={{
            opacity: 0,
            y: 15,
            scale: 0.97,
            filter: "blur(4px)",
            transition: { duration: 0.15, ease: [0.4, 0, 1, 1] }
          }}
          className="w-full max-w-[500px] mx-auto bg-white dark:bg-zinc-900 rounded-3xl p-4 pointer-events-auto flex flex-col gap-3 select-none"
        >
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: {...SPRING, delay: 0.05 } }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelect("task")}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-left active:bg-blue-100 dark:active:bg-blue-900/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div className="text-center">
                <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">Hỗ trợ tức thì</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 leading-tight">Đăng việc nhanh, có người nhận ngay</p>
              </div>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: {...SPRING, delay: 0.1 } }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelect("plan")}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-left active:bg-emerald-100 dark:active:bg-emerald-900/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CalendarRange className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div className="text-center">
                <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">Cùng chung sở thích</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 leading-tight">Gặp gỡ những người cùng đam mê</p>
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}