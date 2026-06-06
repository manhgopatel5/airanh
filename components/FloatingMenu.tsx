"use client";
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from "framer-motion";
import { CalendarRange, Zap, Users } from "lucide-react";

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

// Màu đồng bộ với CreateWorkPage
const THEME = {
  task: {
    primary: "#0A84FF",
    primaryDark: "#0051D5",
    bg: "from-[#0A84FF]/10 via-[#0A84FF]/5 to-transparent",
    bgDark: "from-[#0A84FF]/20 via-[#0A84FF]/10 to-transparent",
    ring: "ring-[#0A84FF]/20",
    glow: "shadow-[#0A84FF]/30"
  },
  plan: {
    primary: "#30D158",
    primaryDark: "#248A3D",
    bg: "from-[#30D158]/10 via-[#30D158]/5 to-transparent",
    bgDark: "from-[#30D158]/20 via-[#30D158]/10 to-transparent",
    ring: "ring-[#30D158]/20",
    glow: "shadow-[#30D158]/30"
  }
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

  const handleSelect = (type: "task" | "plan") => {
    if (navigator.vibrate) navigator.vibrate(10); // Haptic
    onSelect(type);
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md z-40"
          />

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
            className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[500px] z-50 pointer-events-auto"
          >
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl rounded-[2rem] p-3 shadow-2xl shadow-black/10 dark:shadow-black/30 ring-1 ring-black/5 dark:ring-white/10">
              {/* Drag handle */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3 cursor-grab active:cursor-grabbing"
              />

              <div className="grid grid-cols-2 gap-2.5">
                {/* TASK CARD */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: {...SPRING, delay: 0.05 } }}
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleSelect("task")}
                  className="group relative flex flex-col items-center gap-3 p-5 rounded-3xl overflow-hidden transition-all"
                >
                  {/* Gradient mesh background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${THEME.task.bg} dark:${THEME.task.bgDark} opacity-60 group-active:opacity-100 transition-opacity`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent dark:from-zinc-900/50" />

                  {/* Glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.1), 0 8px 32px -8px ${THEME.task.primary}40`
                    }}
                  />

                  {/* Icon container */}
                  <motion.div
                    className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${THEME.task.primary}, ${THEME.task.primaryDark})`,
                    }}
                    whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.4 } }}
                  >
                    <div className="absolute inset-0 rounded-2xl bg-white/20" />
                    <Zap className="w-7 h-7 text-white relative z-10" strokeWidth={2.5} fill="white" />
                  </motion.div>

                  <div className="relative z-10 text-center">
                    <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-[15px] tracking-tight leading-tight">
                      Hỗ trợ tức thì
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold mt-1 leading-tight">
                      Đăng việc nhanh,<br/>có người nhận ngay
                    </p>
                  </div>

                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "200%", transition: { duration: 0.6 } }}
                  />
                </motion.button>

                {/* PLAN CARD */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: {...SPRING, delay: 0.1 } }}
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleSelect("plan")}
                  className="group relative flex flex-col items-center gap-3 p-5 rounded-3xl overflow-hidden transition-all"
                >
                  {/* Gradient mesh background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${THEME.plan.bg} dark:${THEME.plan.bgDark} opacity-60 group-active:opacity-100 transition-opacity`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent dark:from-zinc-900/50" />

                  {/* Glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.1), 0 8px 32px -8px ${THEME.plan.primary}40`
                    }}
                  />

                  {/* Icon container */}
                  <motion.div
                    className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${THEME.plan.primary}, ${THEME.plan.primaryDark})`,
                    }}
                    whileHover={{ rotate: [0, 5, -5, 0], transition: { duration: 0.4 } }}
                  >
                    <div className="absolute inset-0 rounded-2xl bg-white/20" />
                    <Users className="w-7 h-7 text-white relative z-10" strokeWidth={2.5} />
                  </motion.div>

                  <div className="relative z-10 text-center">
                    <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-[15px] tracking-tight leading-tight">
                      Cùng chung sở thích
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold mt-1 leading-tight">
                      Gặp gỡ những người<br/>cùng đam mê
                    </p>
                  </div>

                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "200%", transition: { duration: 0.6 } }}
                  />
                </motion.button>
              </div>

              {/* Bottom hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.2 } }}
                className="text-[10px] text-center text-zinc-400 dark:text-zinc-600 font-medium mt-2"
              >
                Vuốt xuống để đóng
              </motion.p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}