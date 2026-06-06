"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Users } from "lucide-react";

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

const THEME = {
  task: {
    primary: "#0A84FF",
    primaryDark: "#0051D5",
  },
  plan: {
    primary: "#30D158",
    primaryDark: "#248A3D",
  }
};

interface FloatingMenuProps {
  isOpen: boolean;
  onSelect: (type: "task" | "plan") => void;
  onClose: () => void;
}

export default function FloatingMenu({ isOpen, onSelect, onClose }: FloatingMenuProps) {
  const handleSelect = (type: "task" | "plan") => {
    if (navigator.vibrate) navigator.vibrate(10);
    onSelect(type);
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md z-40"
          />

          {/* Căn giữa màn hình - Bỏ khung trắng ngoài */}
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: SPRING_BOUNCY
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: 10,
                transition: { duration: 0.15, ease: [0.4, 0, 1, 1] }
              }}
              className="w-full max-w-[480px] pointer-events-auto"
            >
              {/* Bỏ div bg-white/90 ở đây */}
              <div className="grid grid-cols-2 gap-3">
                {/* TASK CARD */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: {...SPRING, delay: 0.05 } }}
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleSelect("task")}
                  className="group relative flex flex-col items-center gap-3.5 p-6 rounded- overflow-hidden transition-all select-none backdrop-blur-2xl shadow-2xl shadow-black/20 ring-1 ring-black/10"
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    background: `linear-gradient(135deg, ${THEME.task.primary}20, ${THEME.task.primary}10)`
                  }}
                >
                  <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80" />

                  <motion.div
                    className="absolute inset-0 rounded- opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.2), 0 8px 32px -8px ${THEME.task.primary}60`
                    }}
                  />

                  <motion.div
                    className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${THEME.task.primary}, ${THEME.task.primaryDark})`,
                    }}
                    whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.4 } }}
                  >
                    <div className="absolute inset-0 rounded-2xl bg-white/20" />
                    <Zap className="w-8 h-8 text-white relative z-10" strokeWidth={2.5} fill="white" />
                  </motion.div>

                  <div className="relative z-10 text-center">
                    <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-base tracking-tight leading-tight">
                      Hỗ trợ tức thì
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold mt-1.5 leading-tight">
                      Đăng việc nhanh,<br/>có người nhận ngay
                    </p>
                  </div>
                </motion.button>

                {/* PLAN CARD */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: {...SPRING, delay: 0.1 } }}
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleSelect("plan")}
                  className="group relative flex flex-col items-center gap-3.5 p-6 rounded- overflow-hidden transition-all select-none backdrop-blur-2xl shadow-black/20 ring-1 ring-black/10"
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    background: `linear-gradient(135deg, ${THEME.plan.primary}20, ${THEME.plan.primary}10)`
                  }}
                >
                  <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80" />

                  <motion.div
                    className="absolute inset-0 rounded- opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.2), 0 8px 32px -8px ${THEME.plan.primary}60`
                    }}
                  />

                  <motion.div
                    className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${THEME.plan.primary}, ${THEME.plan.primaryDark})`,
                    }}
                    whileHover={{ rotate: [0, 5, -5, 0], transition: { duration: 0.4 } }}
                  >
                    <div className="absolute inset-0 rounded-2xl bg-white/20" />
                    <Users className="w-8 h-8 text-white relative z-10" strokeWidth={2.5} />
                  </motion.div>

                  <div className="relative z-10 text-center">
                    <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-base tracking-tight leading-tight">
                      Cùng chung sở thích
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold mt-1.5 leading-tight">
                      Gặp gỡ những người<br/>cùng đam mê
                    </p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}