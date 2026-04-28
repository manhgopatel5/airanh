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
      titles: ["Không ai đăng hết luôn á? Ủa alo? 📢"],
      descs: ["Người khác chưa đăng vì đang chờ bạn đó 👀"],
      icon: FiTrendingUp,
      suggests: [
        "Tuyển 5 người đi bắt chồng ngoại tình 😭",
        "Giả làm người yêu tui 1 buổi gặp họ hàng 🙃",
        "Qua dọn giùm phòng gấp mẹ tui sắp về 😭",
        "Chạy deadline giùm, tui hứa sẽ biết ơn (chắc vậy) 😰"
      ]
    },
    near: {
      titles: ["Đăng cái gì đó cho khu này xôm lên đi 🔥"],
      descs: ["Im lặng đáng sợ luôn á 😱"],
      icon: FiSend,
      suggests: [
        "Ship giùm hộp cơm tui đói sắp xỉu 🍱",
        "Mua thuốc panadol giùm cái coi 😵",
        "Cho xin cục sạc, pin tui sắp về với tổ tiên 🔋",
        "Ai rảnh qua bắt gián hộ tui với 🪳"
      ]
    },
    new: {
      titles: ["Nhanh tay còn kịp, chậm là mất 👀"],
      descs: ["Đây là nơi săn job nhanh hơn crush rep tin nhắn 💬"],
      icon: FiInbox,
      suggests: [
        "Cần người cứu gấp sắp toi rồi 🆘",
        "In tài liệu gấp, máy in tui phản chủ rồi 🖨️",
        "Làm nhanh về sớm, làm chậm về trễ 😎",
        "Chụp hình sống ảo cho tui 100 tấm 📸"
      ]
    },
    friends: {
      titles: ["Toàn job từ bạn bè, nhận phát là có uy tín liền 🤝"],
      descs: ["Giúp bạn hôm nay, mai bạn giúp lại (hy vọng vậy) 🫠"],
      icon: FiUsers,
      suggests: [
        "Qua phụ dọn nhà, tui bao ăn 🧹",
        "Việc cho người quen thôi, qua Cam kiếm tiền",
        "Comment dạo giúp tui cho bài đỡ flop 💬 trả công 5 chục",
        "Tìm người đốt nhà ngừoi yêu cũ 🤫"
      ]
    },
  },

  plan: {
    hot: {
      titles: ["Kèo này mà bỏ là phí thanh xuân đó 😭🔥"],
      descs: ["Join lẹ kẻo full slot đó 👀"],
      icon: FiZap,
      suggests: [
        "Cafe sáng tám chuyện chill chill đê  ☕",
        "Đi ăn chung cho tui đỡ ngại đi một mình 🍜",
        "Boardgame thua trả tiền nào 😏",
        "Phượt Vũng tàu nhẹ cái cho đã 🏍️"
      ]
    },
    near: {
      titles: ["Ê khu này im ắng quá nghe 🤨"],
      descs: ["Không cần đi xa, vui ngay gần nhà 😏"],
      icon: FiMapPin,
      suggests: [
        "Cafe gần nhà cho tiện ghé nào ☕",
        "Chạy bộ 5 phút nghỉ 30 phút🏃",
        "Bi-a giao lưu nhẹ mấy fen 🎱",
        "Workshop đi cho nó soang 🎨"
      ]
    },
    new: {
      titles: ["Chưa ai mở kèo mới hết bây 😗"],
      descs: ["Plan mới đăng, còn nóng hổi 🆕"],
      icon: FiClock,
      suggests: [
        "Kèo tối nay Q1 luôn không tụi bây 🍻",
        "Đi ăn không đặt bàn nhanh nào 😤",
        "Tối xem C1 trận MU - Ars nào 🤡",
        "Ê tự nhiên muốn đi đảo khỉ Cần Giờ  🐒"
      ]
    },
    friends: {
      titles: ["Mấy đứa đâu rồi vào nhanh 😏"],
      descs: ["Kèo người quen, không đi là kỳ đó 😏"],
      icon: FiUserPlus,
      suggests: [
        "Mai sinh nhật tao làm lớn đê 🎂",
        "Nhà ai có cơm cho tui ăn ké với đói quá 😭",
        "Đi Đà Lạt trốn việc sếp chửi thì giả điếc 🌲",
        "Team building cho có hình tao đăng Fb 📸"
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
    tabActive: "text-sky-500",
    tabLine: "bg-sky-500",
  },
  plan: {
    iconBg: "bg-green-500/10 dark:bg-green-400/15",
    iconColor: "text-green-600 dark:text-green-400",
    tagBg: "bg-green-500/10 hover:bg-green-500/20 dark:bg-green-400/15 dark:hover:bg-green-400/25",
    tagText: "text-green-700 dark:text-green-300",
    buttonBg: "bg-green-500 hover:bg-green-600 dark:bg-green-500 dark:hover:bg-green-600",
    buttonText: "text-white",
    tabActive: "text-green-500",
    tabLine: "bg-green-500",
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