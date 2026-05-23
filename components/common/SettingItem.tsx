"use client";

import { ChevronRight, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

type Props = {
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  onClick?: () => void;
  danger?: boolean;
  rightElement?: ReactNode;
  showChevron?: boolean;
};

export default function SettingItem({
  label,
  subtitle,
  icon: Icon,
  iconColor = "text-[#0F172A] dark:text-white",
  iconBg = "bg-[#F1F5F9] dark:bg-zinc-800",
  onClick,
  danger,
  rightElement,
  showChevron = true,
}: Props) {
  return (
    <button
      onClick={() => {
        if ("vibrate" in navigator) navigator.vibrate(5);
        onClick?.();
      }}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[#F8FAFC] dark:active:bg-zinc-800 transition"
    >
      {/* Icon 36px giống Zalo */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          danger ? "bg-red-50 dark:bg-red-950/30" : iconBg
        }`}
      >
        <Icon
          className={`w-5 h-5 ${danger ? "text-red-500" : iconColor}`}
        />
      </div>

      <div className="flex-1 text-left min-w-0">
        <div
          className={`text-base font-semibold ${
            danger ? "text-red-500" : "text-[#0F172A] dark:text-white"
          }`}
        >
          {label}
        </div>
        {subtitle && (
          <div className="text-sm text-[#64748B] dark:text-zinc-400 mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>

      {/* Right: ưu tiên rightElement, không có thì hiện chevron */}
      {rightElement ? (
        <div className="flex-shrink-0">{rightElement}</div>
      ) : showChevron ? (
        <ChevronRight className="w-5 h-5 text-[#CBD5E1] dark:text-zinc-600 flex-shrink-0" />
      ) : null}
    </button>
  );
}