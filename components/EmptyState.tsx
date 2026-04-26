"use client";
import { motion } from "framer-motion";
import { HiPlus, HiArrowPath } from "react-icons/hi2";
import { useRouter } from "next/navigation";

type TabId = "hot" | "near" | "new" | "friends";

const messages = {
  hot: {
    title: "Chưa có gì bùng nổ",
    desc: "Hãy là người đầu tiên tạo trend\nvà nhận ngàn like",
    emoji: "🔥",
    gradient: "from-orange-500 to-pink-500"
  },
  near: {
    title: "Quanh đây trống quá",
    desc: "Tạo việc gần bạn để\nkết nối với hàng xóm",
    emoji: "📍",
    gradient: "from-emerald-500 to-cyan-500"
  },
  new: {
    title: "Chưa có việc mới",
    desc: "Đăng việc đầu tiên\ngiành slot hot",
    emoji: "✨",
    gradient: "from-blue-500 to-violet-500"
  },
  friends: {
    title: "Bạn bè chưa đăng gì",
    desc: "Mời bạn bè vào\nđăng việc kiếm tiền chung",
    emoji: "👥",
    gradient: "from-purple-500 to-rose-500"
  },
};

type Props = {
  tab: TabId;
  onRefresh?: () => void;
};

export default function EmptyState({ tab, onRefresh }: Props) {
  const router = useRouter();
  const msg = messages[tab];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center min-h-">
      <div className="mb-8 text-8xl">
        {msg.emoji}
      </div>

      <h3
        className={`text-2xl font-black bg-gradient-to-r ${msg.gradient} bg-clip-text text-transparent mb-3`}
      >
        {msg.title}
      </h3>

      <p className="text-sm text-gray-500 dark:text-zinc-400 mb-10 whitespace-pre-line leading-relaxed max-w-xs">
        {msg.desc}
      </p>

      <div className="flex gap-3 items-center">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-5 py-3 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform"
          >
            <HiArrowPath size={18} />
            Làm mới
          </button>
        )}

        <button
          onClick={() => router.push("/create")}
          className={`relative px-7 py-3.5 rounded-full font-black text-sm text-white bg-gradient-to-r ${msg.gradient} active:scale-95 transition-transform`}
        >
          <span className="flex items-center gap-2">
            <HiPlus size={20} strokeWidth={3} />
            Đăng việc ngay
          </span>
        </button>
      </div>
    </div>
  );
}