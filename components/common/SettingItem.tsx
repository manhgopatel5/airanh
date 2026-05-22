import { ChevronRight } from "lucide-react";
import { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
  danger?: boolean;
};

export default function SettingItem({
  label,
  subtitle,
  icon: Icon,
  iconColor = "text-gray-500",
  onClick,
  danger,
}: Props) {
  return (
    <button
      onClick={() => {
        if ("vibrate" in navigator) navigator.vibrate(5);
        onClick?.();
      }}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-zinc-800 transition"
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 ${danger ? "text-red-500" : iconColor}`}
      />
      <div className="flex-1 text-left min-w-0">
        <div
          className={`text-base font-medium ${
            danger ? "text-red-500" : "text-gray-900 dark:text-white"
          }`}
        >
          {label}
        </div>
        {subtitle && (
          <div className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-zinc-600 flex-shrink-0" />
    </button>
  );
}