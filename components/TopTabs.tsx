"use client";
import { HiFire, HiClock, HiSparkles, HiUsers } from "react-icons/hi2";
import { motion, AnimatePresence } from "framer-motion";

type TabId = "hot" | "near" | "new" | "friends";

const tabs = [
  { id: "hot" as TabId, label: "Hot", icon: HiFire, color: "from-orange-500 to-red-500" },
  { id: "near" as TabId, label: "Gần", icon: HiClock, color: "from-emerald-500 to-teal-500" },
  { id: "new" as TabId, label: "Mới", icon: HiSparkles, color: "from-blue-500 to-indigo-500" },
  { id: "friends" as TabId, label: "Bạn bè", icon: HiUsers, color: "from-purple-500 to-pink-500" },
] as const;

type Props = {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  counts?: Partial<Record<TabId, number>>;
};

export default function TopTabs({ activeTab, setActiveTab, counts }: Props) {
  return (
    <div className="sticky top-0 z-30 safe-top">
      {/* Glass + gradient border bottom */}
      <div className="relative bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl">
        <div className="flex items-center justify-between px-1 h-16 max-w-2xl mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = counts?.[tab.id];
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (navigator.vibrate) navigator.vibrate(8);
                }}
                className="relative flex-1 flex items-center justify-center h-full group"
              >
                {/* Active Pill Background */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBg"
                      className={`absolute inset-x-1 inset-y-2 rounded-2xl bg-gradient-to-br ${tab.color} opacity-10 dark:opacity-20`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                </AnimatePresence>

                {/* Glow khi active */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`absolute inset-x-4 inset-y-3 rounded-2xl bg-gradient-to-br ${tab.color} blur-xl opacity-30`}
                    />
                  )}
                </AnimatePresence>

                <div className="relative flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform duration-150">
                  <div className="relative">
                    <motion.div
                      animate={{ 
                        scale: isActive? 1.2 : 1,
                        y: isActive? -2 : 0
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Icon
                        size={24}
                        className={`transition-all duration-300 ${
                          isActive
                           ? "text-gray-900 dark:text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                            : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300"
                        }`}
                      />
                    </motion.div>

                    {/* Badge count */}
                    <AnimatePresence>
                      {count && count > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-zinc-950"
                        >
                          {count > 99 ? "99+" : count}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.span
                    animate={{ 
                      fontWeight: isActive? 800 : 600,
                      opacity: isActive? 1 : 0.6
                    }}
                    className={`text-[11px] tracking-tight transition-colors duration-300 ${
                      isActive
                       ? "text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-zinc-500"
                    }`}
                  >
                    {tab.label}
                  </motion.span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Gradient line bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300/50 to-transparent dark:via-zinc-700/50" />
      </div>
    </div>
  );
}