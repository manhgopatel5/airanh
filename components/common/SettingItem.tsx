import { ChevronRight } from "lucide-react";

export default function SettingItem({ label, icon: Icon, onClick, danger }: { label: string; icon: React.ElementType; onClick?: () => void; danger?: boolean; }) {
  return (
    <button onClick={() => { if ("vibrate" in navigator) navigator.vibrate(5); onClick?.(); }} className="w-full flex items-center justify-between py-3.5 active:opacity-50 transition-opacity border-b border-gray-50 dark:border-zinc-900 text-left">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${danger ? "text-red-500" : "text-gray-700 dark:text-zinc-300"}`} />
        <span className={`text-base font-semibold ${danger ? "text-red-500" : "text-gray-900 dark:text-white"}`}>{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  );
}