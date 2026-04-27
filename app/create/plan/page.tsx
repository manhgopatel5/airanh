"use client";
import { HiPlus } from "react-icons/hi2";
import {
  FiTrendingUp, FiSend, FiInbox, FiUsers,
  FiZap, FiMapPin, FiClock, FiUserPlus
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type TabId = "hot" | "near" | "new" | "friends";
type PostType = "task" | "plan";

const CONTENT_POOL = {
  task: {
    hot: {
      titles: ["Chưa có việc nào", "Đang chờ việc đầu tiên", "Mọi thứ còn trống"],
      descs: [
        "Đăng việc đầu tiên để nhận báo giá\ntừ người làm trong 5 phút",
        "Tạo việc ngay để người làm\nxung quanh thấy bạn",
        "Bắt đầu bằng một việc nhỏ\nđể kết nối cộng đồng"
      ],
      icon: FiTrendingUp,
      suggests: [
        "Ship hồ sơ Q1 → Q7", "Mua trà sữa 3 ly", "Dọn phòng 25m²", "Sửa vòi nước rỉ",
        "Giao hàng gấp 2km", "Mua đồ siêu thị", "Lau kính văn phòng", "Thay bóng đèn"
      ]
    },
    near: {
      titles: ["Quanh đây chưa có việc", "Khu vực này đang trống", "Chưa ai đăng gần bạn"],
      descs: [
        "Tạo việc gần bạn để kết nối\nvới người trong khu vực",
        "Đăng việc tại chỗ để hàng xóm\nnhận làm ngay",
        "Bắt đầu kết nối với\nngười làm quanh đây"
      ],
      icon: FiSend,
      suggests: [
        "Ship cơm trưa văn phòng", "Mua thuốc nhà thuốc", "Rửa xe máy tại nhà", "Lắp camera",
        "Đi chợ giúp", "Đưa đón bé", "Sửa ống nước", "Dọn nhà theo giờ"
      ]
    },
    new: {
      titles: ["Chưa có việc mới", "Hôm nay chưa ai đăng", "Bảng tin đang trống"],
      descs: [
        "Hãy là người đầu tiên đăng việc\ntrong hôm nay",
        "Tạo việc mới để mọi người\nbắt đầu ngày mới",
        "Đăng ngay để nhận\nphản hồi sớm nhất"
      ],
      icon: FiInbox,
      suggests: [
        "Đăng việc gấp", "Thuê sinh viên", "Cần người hôm nay", "Việc 2 tiếng",
        "Tuyển gấp ca tối", "Làm ngay tại chỗ", "Cần trong 1h", "Việc part-time"
      ]
    },
    friends: {
      titles: ["Bạn bè chưa đăng việc", "Danh sách bạn đang trống", "Chưa có tin từ bạn bè"],
      descs: [
        "Mời bạn bè tham gia để\ntìm việc và thuê người dễ hơn",
        "Rủ bạn bè vào để cùng\nđăng việc cho nhau",
        "Kết nối bạn bè để\ntạo cộng đồng riêng"
      ],
      icon: FiUsers,
      suggests: [
        "Mời bạn bè", "Việc cho người quen", "Nhóm freelancer", "Share lên story",
        "Tạo nhóm riêng", "Giới thiệu app", "Rủ bạn cùng làm", "Team nội bộ"
      ]
    },
  },
  plan: {
    hot: {
      titles: ["Chưa có kế hoạch hot", "Chưa ai lên kèo", "Mọi người đang im ắng"],
      descs: [
        "Tạo hoạt động đầu tiên để\nrủ mọi người tham gia",
        "Lên kèo ngay để khuấy động\ncộng đồng",
        "Bắt đầu cuộc vui bằng\nmột kế hoạch nhỏ"
      ],
      icon: FiZap,
      suggests: [
        "Cafe sáng T7", "Nhậu tối nay Q1", "Boardgame 4 người", "Phượt Vũng Tàu",
        "Karaoke team", "Bida tối nay", "Ăn lẩu 6 người", "Xem concert"
      ]
    },
    near: {
      titles: ["Quanh đây chưa có hẹn", "Khu này chưa có kèo", "Chưa ai rủ gần bạn"],
      descs: [
        "Lên kèo gần bạn để offline\ncùng hàng xóm",
        "Tạo hoạt động tại chỗ để\ngặp gỡ người gần đây",
        "Bắt đầu kết nối offline\nvới khu vực của bạn"
      ],
      icon: FiMapPin,
      suggests: [
        "Cafe Landmark 81", "Chạy bộ công viên", "Bi-a gần đây", "Workshop vẽ",
        "Cầu lông sân gần", "Nhậu quán quen", "Đi dạo phố đi bộ", "Chụp ảnh couple"
      ]
    },
    new: {
      titles: ["Chưa có kế hoạch mới", "Hôm nay chưa có hẹn", "Lịch đang trống"],
      descs: [
        "Tạo sự kiện đầu tiên\ntrong hôm nay",
        "Lên kèo mới để mọi người\ntham gia cùng",
        "Bắt đầu ngày mới bằng\nmột cuộc hẹn vui"
      ],
      icon: FiClock,
      suggests: [
        "Lên kèo tối nay", "Đặt bàn 6 người", "Xem phim CGV", "Đá banh sân 5",
        "Ăn tối 8h", "Nhậu khuya", "Cafe đêm", "Đi bar chill"
      ]
    },
    friends: {
      titles: ["Bạn bè chưa lên kèo", "Nhóm bạn đang im", "Chưa có lời mời nào"],
      descs: [
        "Rủ bạn bè tạo kế hoạch\nđi chơi chung",
        "Lên kèo với nhóm bạn\nđể gắn kết hơn",
        "Tạo hoạt động riêng\ncho hội bạn thân"
      ],
      icon: FiUserPlus,
      suggests: [
        "Sinh nhật team", "Tân gia nhà mới", "Đi Đà Lạt nhóm", "Team building",
        "Tất niên công ty", "Picnic cuối tuần", "Du lịch nhóm", "Họp lớp"
      ]
    },
  },
};

const THEME = {
  task: {
    iconBg: "bg-sky-500/10 dark:bg-sky-400/15",
    iconColor: "text-sky-600 dark:text-sky-400",
    tagBg: "bg-sky-500/10 hover:bg-sky-500/20 dark:bg-sky-400/15 dark:hover:bg-sky-400/25",
    tagText: "text-sky-700 dark:text-sky-300",
    buttonBg: "bg-sky-500 hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600",
    buttonText: "text-white",
  },
  plan: {
    iconBg: "bg-green-500/10 dark:bg-green-400/15",
    iconColor: "text-green-600 dark:text-green-400",
    tagBg: "bg-green-500/10 hover:bg-green-500/20 dark:bg-green-400/15 dark:hover:bg-green-400/25",
    tagText: "text-green-700 dark:text-green-300",
    buttonBg: "bg-green-500 hover:bg-green-600 dark:bg-green-500 dark:hover:bg-green-600",
    buttonText: "text-white",
  },
};

const getRandomItems = <T,>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

type Props = {
  tab: TabId;
  type?: PostType;
};

export default function EmptyState({ tab, type = "task" }: Props) {
  const router = useRouter();
  const theme = THEME[type];
  const pool = CONTENT_POOL[type][tab];

  const [content, setContent] = useState(() => ({
    title: pool.titles[0],
    desc: pool.descs[0],
    icon: pool.icon,
    suggests: pool.suggests.slice(0, 4),
  }));

  useEffect(() => {
    setContent({
      title: pool.titles[Math.floor(Math.random() * pool.titles.length)],
      desc: pool.descs[Math.floor(Math.random() * pool.descs.length)],
      icon: pool.icon,
      suggests: getRandomItems(pool.suggests, 4),
    });
  }, [type, tab]);

  const Icon = content.icon;

  const handleSuggestClick = (suggest: string) => {
    if ("vibrate" in navigator) navigator.vibrate(5);
    const path = type === "task"? "/create/task" : "/create/plan";
    router.push(`${path}?title=${encodeURIComponent(suggest)}`);
  };

  const handleCreateClick = () => {
    const path = type === "task"? "/create/task" : "/create/plan";
    router.push(path);
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
          {content.title}
        </h3>

        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 whitespace-pre-line leading-relaxed max-w-xs">
          {content.desc}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 justify-center max-w-sm mb-8"
      >
        {content.suggests.map((suggest) => (
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
      >
        <button
          onClick={handleCreateClick}
          className={`px-5 py-2.5 rounded-lg ${theme.buttonBg} ${theme.buttonText} font-semibold text-sm flex items-center gap-2 active:scale-95 transition-all shadow-sm`}
        >
          <HiPlus size={20} strokeWidth={2.5} />
          {type === "task"? "Đăng việc mới" : "Tạo kế hoạch"}
        </button>
      </motion.div>
    </div>
  );
}