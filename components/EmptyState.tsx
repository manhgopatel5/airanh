"use client";
import { HiPlus, HiArrowPath } from "react-icons/hi2";
import { 
  FiTrendingUp, FiNavigation, FiInbox, FiUsers,
  FiZap, FiMapPin, FiClock, FiUserPlus
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type TabId = "hot" | "near" | "new" | "friends";
type PostType = "task" | "plan";

const MESSAGES = {
  task: {
    hot: { 
      title: "Chưa có việc nào", 
      desc: "Đăng việc đầu tiên để nhận báo giá\ntừ người làm trong 5 phút", 
      icon: FiTrendingUp,
      suggests: ["Ship hồ sơ Q1 → Q7", "Mua trà sữa 3 ly", "Dọn phòng 25m²", "Sửa vòi nước rỉ"]
    },
    near: { 
      title: "Quanh đây chưa có việc", 
      desc: "Tạo việc gần bạn để kết nối\nvới người trong khu vực", 
      icon: FiNavigation,
      suggests: ["Ship cơm trưa văn phòng", "Mua thuốc nhà thuốc", "Rửa xe máy tại nhà", "Lắp camera"]
    },
    new: { 
      title: "Chưa có việc mới", 
      desc: "Hãy là người đầu tiên đăng việc\ntrong hôm nay", 
      icon: FiInbox,
      suggests: ["Đăng việc gấp", "Thuê sinh viên", "Cần người hôm nay", "Việc 2 tiếng"]
    },
    friends: { 
      title: "Bạn bè chưa đăng việc", 
      desc: "Mời bạn bè tham gia để\ntìm việc và thuê người dễ hơn", 
      icon: FiUsers,
      suggests: ["Mời bạn bè", "Việc cho người quen", "Nhóm freelancer", "Share lên story"]
    },
  },
  plan: {
    hot: { 
      title: "Chưa có kế hoạch hot", 
      desc: "Tạo hoạt động đầu tiên để\nrủ mọi người tham gia", 
      icon: FiZap,
      suggests: ["Cafe sáng T7", "Nhậu tối nay Q1", "Boardgame 4 người", "Phượt Vũng Tàu"]
    },
    near: { 
      title: "Quanh đây chưa có hẹn", 
      desc: "Lên kèo gần bạn để offline\ncùng hàng xóm", 
      icon: FiMapPin,
      suggests: ["Cafe Landmark 81", "Chạy bộ công viên", "Bi-a gần đây", "Workshop vẽ"]
    },
    new: { 
      title: "Chưa có kế hoạch mới", 
      desc: "Tạo sự kiện đầu tiên\ntrong hôm nay", 
      icon: FiClock,
      suggests: ["Lên kèo tối nay", "Đặt bàn 6 người", "Xem phim CGV", "Đá banh sân 5"]
    },
    friends: { 
      title: "Bạn bè chưa lên kèo", 
      desc: "Rủ bạn bè tạo kế hoạch\nđi chơi chung", 
      icon: FiUserPlus,
      suggests: ["Sinh nhật team", "Tân gia nhà mới", "Đi Đà Lạt nhóm", "Team building"]
    },
  },
};

const THEME = {
  task: {
    iconBg: "bg-orange-500/10 dark:bg-orange-400/15",
    iconColor: "text-orange-600 dark:text-orange-400",
    tagBg: "bg-orange-500/10 hover:bg-orange-500/20 dark:bg-orange-400/15 dark:hover:bg-orange-400/25",
    tagText: "text-orange-700 dark:text-orange-300",
    buttonBg: "bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600",
    buttonText: "text-white",
  },
  plan: {
    iconBg: "bg-violet-500/10 dark:bg-violet-400/15",
    iconColor: "text-violet-600 dark:text-violet-400",
    tagBg: "bg-violet-500/10 hover:bg-violet-500/20 dark:bg-violet-400/15 dark:hover:bg-violet-400/25",
    tagText: "text-violet-700 dark:text-violet-300",
    buttonBg: "bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600",
    buttonText: "text-white",
  },
};

type Props = {
  tab: TabId;
  type?: PostType;
  onRefresh?: () => void;
};

export default function EmptyState({ tab, type = "task", onRefresh }: Props) {
  const router = useRouter();
  const msg = MESSAGES[type][tab];
  const theme = THEME[type];
  const Icon = msg.icon;

  const handleSuggestClick = (suggest: string) => {
    if ("vibrate" in navigator) navigator.vibrate(5);
    router.push(`/create/${type}?suggest=${encodeURIComponent(suggest)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`w-16 h-16 rounded-2xl ${theme.iconBg} flex items-center justify-center mb-5`}
      >
        <Icon className={theme.iconColor} size={28} strokeWidth={1.75} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-2">
          {msg.title}
        </h3>

        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 whitespace-pre-line leading-relaxed max-w-xs">
          {msg.desc}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 justify-center max-w-sm mb-8"
      >
        {msg.suggests.map((suggest) => (
          <button
            key={suggest}
            onClick={() => handleSuggestClick(suggest)}
            className={`px-3.5 py-1.5 rounded-full ${theme.tagBg} ${theme.tagText} text-sm font-medium active:scale-95 transition-all`}
          >
            {suggest}
          </button>
        ))}
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
          className={`px-5 py-2.5 rounded-lg ${theme.buttonBg} ${theme.buttonText} font-semibold text-sm flex items-center gap-2 active:scale-95 transition-all shadow-sm`}
        >
          <HiPlus size={20} strokeWidth={2.5} />
          {type === "task"? "Đăng việc mới" : "Tạo kế hoạch"}
        </button>
      </motion.div>
    </div>
  );
}