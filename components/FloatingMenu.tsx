"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Users } from "lucide-react";

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
    // 1. Bỏ mode="wait"
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }} // Thêm duration cố định
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md z-40"
          />

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
              <div className="grid grid-cols-2 gap-4">
                {/* TASK CARD - Bỏ initial/animate */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleSelect("task")}
                  className="group relative flex flex-col items-center gap-4 p-6 overflow-hidden transition-all select-none"
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    borderRadius: '32px',
                    background: '#FFFFFF',
                    border: `2px solid ${THEME.task.primary}40`,
                    boxShadow: `
                      0 12px 24px -8px rgba(0,0,0,0.15),
                      0 4px 8px -4px rgba(0,0,0,0.1),
                      inset 0 1px 0 0 rgba(255,255,255,0.8),
                      inset 0 -1px 0 0 rgba(0,0,0,0.05)
                    `
                  }}
                >
                  <motion.div
                    className="relative z-10 w-16 h-16 flex items-center justify-center"
                    style={{
                      borderRadius: '20px',
                      background: `linear-gradient(135deg, ${THEME.task.primary}, ${THEME.task.primaryDark})`,
                      boxShadow: `0 8px 16px -4px ${THEME.task.primary}80, inset 0 1px 0 0 rgba(255,255,255,0.3)`
                    }}
                    whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.4 } }}
                  >
                    <div
                      className="absolute inset-0 rounded-[20px]"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)'
                      }}
                    />
                    <Zap className="w-8 h-8 text-white relative z-10" strokeWidth={2.5} fill="white" />
                  </motion.div>

                  <div className="relative z-10 text-center">
                    <h4 className="font-black text-zinc-900 text-base tracking-tight leading-tight">
                      Hỗ trợ tức thì
                    </h4>
                    <p className="text-xs text-zinc-600 font-semibold mt-1.5 leading-tight">
                      Đăng việc nhanh,<br/>có người nhận ngay
                    </p>
                  </div>
                </motion.button>

                {/* PLAN CARD - Bỏ initial/animate */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleSelect("plan")}
                  className="group relative flex flex-col items-center gap-4 p-6 overflow-hidden transition-all select-none"
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    borderRadius: '32px',
                    background: '#FFFFFF',
                    border: `2px solid ${THEME.plan.primary}40`,
                    boxShadow: `
                      0 12px 24px -8px rgba(0,0,0,0.15),
                      0 4px 8px -4px rgba(0,0,0,0.1),
                      inset 0 1px 0 0 rgba(255,255,0.8),
                      inset 0 -1px 0 0 rgba(0,0,0,0.05)
                    `
                  }}
                >
                  <motion.div
                    className="relative z-10 w-16 h-16 flex items-center justify-center"
                    style={{
                      borderRadius: '20px',
                      background: `linear-gradient(135deg, ${THEME.plan.primary}, ${THEME.plan.primaryDark})`,
                      boxShadow: `0 8px 16px -4px ${THEME.plan.primary}80, inset 0 1px 0 0 rgba(255,255,255,0.3)`
                    }}
                    whileHover={{ rotate: [0, 5, -5, 0], transition: { duration: 0.4 } }}
                  >
                    <div
                      className="absolute inset-0 rounded-[20px]"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)'
                      }}
                    />
                    <Users className="w-8 h-8 text-white relative z-10" strokeWidth={2.5} />
                  </motion.div>

                  <div className="relative z-10 text-center">
                    <h4 className="font-black text-zinc-900 text-base tracking-tight leading-tight">
                      Cùng chung sở thích
                    </h4>
                    <p className="text-xs text-zinc-600 font-semibold mt-1.5 leading-tight">
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