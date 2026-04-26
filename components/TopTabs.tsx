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
    <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between px-3 h-14 max-w-2xl mx-auto gap-1">
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
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl active:scale-95 transition-transform ${
                isActive? `bg-gradient-to-br ${tab.color}` : ""
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="relative h-5 flex items-center justify-center">
                <Icon
                  size={20}
                  className={isActive? "text-white" : "text-gray-400"}
                />

                {count && count > 0 && (
                  <div className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-2xs font-bold flex items-center justify-center">
                    {count > 99? "99+" : count}
                  </div>
                )}
              </div>

              <span
                className={`text-xs font-semibold tracking-tight ${
                  isActive? "text-white" : "text-gray-500"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}