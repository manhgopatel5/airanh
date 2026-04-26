"use client";
import { HiFire, HiMapPin, HiSparkles, HiUsers } from "react-icons/hi2";

type TabId = "hot" | "near" | "new" | "friends";

const tabs = [
  {
    id: "hot" as TabId,
    label: "Hot",
    icon: HiFire,
    color: "from-orange-500 to-pink-500",
  },
  {
    id: "near" as TabId,
    label: "Gần",
    icon: HiMapPin,
    color: "from-emerald-500 to-cyan-500",
  },
  {
    id: "new" as TabId,
    label: "Mới",
    icon: HiSparkles,
    color: "from-blue-500 to-violet-500",
  },
  {
    id: "friends" as TabId,
    label: "Bạn bè",
    icon: HiUsers,
    color: "from-purple-500 to-rose-500",
  },
] as const;

type Props = {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  counts?: Partial<Record<TabId, number>>;
};

export default function TopTabs({ activeTab, setActiveTab, counts }: Props) {
  return (
    <div className="sticky top-0 z-30 bg-white dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800">
      <div className="pt-safe px-safe">
        <div className="flex items-center justify-between px-3 h-12 max-w-2xl mx-auto gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = counts?.[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if ("vibrate" in navigator) navigator.vibrate(8);
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl active:scale-95 transition-transform min-w- ${
                  isActive? `bg-gradient-to-br ${tab.color}` : ""
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w- h- sm:w-5 sm:h-5 ${
                      isActive? "text-white" : "text-gray-400 dark:text-zinc-500"
                    }`}
                  />

                  {count && count > 0 && (
                    <div className="absolute -top-1 -right-2 min-w- h-3.5 px-1 rounded-full bg-red-500 text-white text-2xs font-bold flex items-center justify-center">
                      {count > 99? "99+" : count}
                    </div>
                  )}
                </div>

                <span
                  className={`text-xs font-semibold tracking-tight leading-none ${
                    isActive? "text-white" : "text-gray-500 dark:text-zinc-500"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}