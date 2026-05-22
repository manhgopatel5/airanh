"use client";

import { ChevronRight, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

type Props = {
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string; // màu nền icon tròn, giống Zalo/WeChat
  onClick?: () => void;
  danger?: boolean;
  rightElement?: ReactNode; // nhét QR, badge, text, toggle vào đây
  showChevron?: boolean; // tắt chevron khi có rightElement
};

export default function SettingItem({
  label,
  subtitle,
  icon: Icon,
  iconColor = "text-[#0F172A]",
  iconBg = "bg-[#F1F5F9]",
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
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[#F8FAFC] transition"
    >
      {/* Icon có background tròn 36px giống Zalo */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          danger ? "bg-red-50" : iconBg
        }`}
      >
        <Icon
          className={`w-5 h-5 ${danger ? "text-red-500" : iconColor}`}
        />
      </div>

      <div className="flex-1 text-left min-w-0">
        <div
          className={`text- font-semibold ${
            danger ? "text-red-500" : "text-[#0F172A]"
          }`}
        >
          {label}
        </div>
        {subtitle && (
          <div className="text- text-[#64748B] mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>

      {/* Right: ưu tiên rightElement, không có thì hiện chevron */}
      {rightElement ? (
        <div className="flex-shrink-0">{rightElement}</div>
      ) : showChevron ? (
        <ChevronRight className="w-5 h-5 text-[#CBD5E1] flex-shrink-0" />
      ) : null}
    </button>
  );
}