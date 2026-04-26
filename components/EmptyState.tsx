"use client";
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
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="mb-6 text-7xl">
        {msg.emoji}
      </div>

      <h3
        className={`text-2xl font-extrabold bg-gradient-to-r ${msg.gradient} bg-clip-text text-transparent mb-2 tracking-tight`}
      >
        {msg.title}
      </h3>

      <p className="text-base text-gray-500 mb-8 whitespace-pre-line leading-relaxed max-w-xs font-medium">
        {msg.desc}
      </p>

      <div className="flex gap-2 items-center">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-6 py-3.5 rounded-full bg-gray-100 text-gray-700 font-semibold text-base flex items-center gap-2 active:scale-95 transition-transform"
          >
            <HiArrowPath size={20} />
            Làm mới
          </button>
        )}

        <button
          onClick={() => router.push("/create")}
          className={`px-8 py-3.5 rounded-full font-bold text-base text-white bg-gradient-to-r ${msg.gradient} active:scale-95 transition-transform`}
        >
          <span className="flex items-center gap-2">
            <HiPlus size={22} strokeWidth={2.5} />
            Đăng việc ngay
          </span>
        </button>
      </div>
    </div>
  );
}
