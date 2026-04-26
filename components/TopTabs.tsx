"use client";
import { HiFire, HiMapPin, HiSparkles, HiUsers } from "react-icons/hi2";
import { motion } from "framer-motion";

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
    <div className="sticky top-0 z-30 safe-top">
      <div className="relative bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-stretch justify-between px-1 h-16 max-w-2xl mx-auto">
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
                className="relative flex-1 flex items-center justify-center py-2 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {isActive && (
                  <div
                    className={`absolute inset-1 rounded-2xl bg-gradient-to-br ${tab.color}`}
                  />
                )}

                <div className="relative flex flex-col items-center justify-center gap-0.5 z-10">
                  <div className="relative h-6 flex items-center justify-center">
                    <Icon
                      size={24}
                      className={`${
                        isActive
                      ? "text-white"
                          : "text-gray-400 dark:text-zinc-500"
                      }`}
                    />

                    {count && count > 0 && (
                      <div className="absolute -top-1.5 -right-2.5 min-w- h- px-1.5 rounded-full bg-red-500 text-white text- font-black flex items-center justify-center border-2 border-white dark:border-zinc-950">
                        {count > 99? "99+" : count}
                      </div>
                    )}
                  </div>

                  <span
                    className={`text- font-sans ${
                      isActive
                  ? "text-white font-black"
                        : "text-gray-500 dark:text-zinc-500 font-semibold"
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}