"use client";
import { HiPlus, HiArrowPath } from "react-icons/hi2";
import { FiZap, FiMapPin, FiClock, FiUsers, FiCalendar } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type TabId = "hot" | "near" | "new" | "friends";
type PostType = "task" | "plan";

const MESSAGES = {
  task: {
    hot: { title: "Chưa có việc nào", desc: "Đăng việc đầu tiên để nhận báo giá\ntừ người làm trong 5 phút", icon: FiZap },
    near: { title: "Quanh đây chưa có việc", desc: "Tạo việc gần bạn để kết nối\nvới người trong khu vực", icon: FiMapPin },
    new: { title: "Chưa có việc mới", desc: "Hãy là người đầu tiên đăng việc\ntrong hôm nay", icon: FiClock },
    friends: { title: "Bạn bè chưa đăng việc", desc: "Mời bạn bè tham gia để\ntìm việc và thuê người dễ hơn", icon: FiUsers },
  },
  plan: {
    hot: { title: "Chưa có kế hoạch hot", desc: "Tạo hoạt động đầu tiên để\nrủ mọi người tham gia", icon: FiZap },
    near: { title: "Quanh đây chưa có hẹn", desc: "Lên kèo gần bạn để offline\ncùng hàng xóm", icon: FiMapPin },
    new: { title: "Chưa có kế hoạch mới", desc: "Tạo sự kiện đầu tiên\ntrong hôm nay", icon: FiCalendar },
    friends: { title: "Bạn bè chưa lên kèo", desc: "Rủ bạn bè tạo kế hoạch\nđi chơi chung", icon: FiUsers },
  },
};

const COLORS = {
  task: {
    accent: "orange",
    accentHex: "text-orange-600 dark:text-orange-500",
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
  },
  plan: {
    accent: "violet", 
    accentHex: "text-violet-600 dark:text-violet-500",
    bg: "bg-violet-500/10 dark:bg-violet-500/20",
  },
};

type Props = {
  tab: TabId;
  type?: PostType; // default = "task"
  onRefresh?: () => void;
};

export default function EmptyState({ tab, type = "task", onRefresh }: Props) {
  const router = useRouter();
  const msg = MESSAGES[type][tab];
  const color = COLORS[type];
  const Icon = msg.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`w-16 h-16 rounded-2xl ${color.bg} flex items-center justify-center mb-5`}
      >
        <Icon className={color.accentHex} size={28} strokeWidth={2} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-2">
          {msg.title}
        </h3>

        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8 whitespace-pre-line leading-relaxed max-w-xs">
          {msg.desc}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 items-center"
      >
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-5 py-2.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-medium text-sm flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
          >
            <HiArrowPath size={18} />
            Làm mới
          </button>
        )}

        <button
          onClick={() => router.push(`/create/${type}`)}
          className="px-5 py-2.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-95 transition-all"
        >
          <HiPlus size={20} strokeWidth={2.5} />
          {type === "task"? "Đăng việc mới" : "Tạo kế hoạch"}
        </button>
      </motion.div>
    </div>
  );
}