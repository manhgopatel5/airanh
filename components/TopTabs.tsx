"use client";
import { HiFire, HiClock, HiSparkles, HiUsers } from "react-icons/hi";

type TabId = "hot" | "near" | "new" | "friends";

const tabs = [
  { id: "hot" as TabId, label: "Hot", icon: HiFire },
  { id: "near" as TabId, label: "Gần", icon: HiClock },
  { id: "new" as TabId, label: "Mới", icon: HiSparkles },
  { id: "friends" as TabId, label: "Bạn bè", icon: HiUsers },
] as const;

type Props = {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
};

export default function TopTabs({ activeTab, setActiveTab }: Props) {
  return (
    <div className="sticky top-0 z-30 safe-top bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border-b border-gray-200/50 dark:border-zinc-800/50">
      <div className="flex items-center justify-between px-4 h-12">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 flex items-center justify-center gap-1.5 h-full group active:scale-95 transition-transform"
            >
              <Icon
                size={18}
                className={`transition-colors duration-300 ${
                  isActive
                  ? "text-blue-600 dark:text-blue-400 scale-110"
                    : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-400"
                }`}
              />
              <span
                className={`text-sm font-bold tracking-tight transition-colors duration-300 ${
                  isActive
                  ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-zinc-400"
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 h-[3px] w-10 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full animate-in slide-in-from-bottom duration-300" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}