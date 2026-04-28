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
      titles: ["Chưa thấy job nào hot 🌝"],
      descs: ["Đăng cái đi, biết đâu thành job hot đầu tiên luôn đó"],
      icon: FiTrendingUp,
      suggests: [
        "Ship hồ sơ lẹ cái 🏃‍♂️",
        "Mua trà sữa cho tui tỉnh 🍹",
        "Dọn giùm phòng gấp mẹ tui sắp về 😭",
        "Sửa giùm cái vòi nước nhỏ giọt 💧"
      ]
    },
    near: {
      titles: ["Xung quanh hơi hơi yên ắng nghen 😴"],
      descs: ["Bạn đăng phát cho khu này xôm lên đê"],
      icon: FiSend,
      suggests: [
        "Ship giùm hộp cơm tui đói sắp xỉu 🍱",
        "Mua thuốc panadol giùm cái coi 😵",
        "Qua rửa xe giùm bụi quá rồi 🛵",
        "Lắp camera cho đỡ lo 👀"
      ]
    },
    new: {
      titles: ["Chưa có gì mới luôn 😅"],
      descs: ["Bạn tạo cái đầu tiên cho có không khí nha"],
      icon: FiInbox,
      suggests: [
        "Cần người cứu gấp sắp toi rồi 🆘",
        "Việc nhẹ lương… chưa rõ 😆",
        "Làm nhanh về sớm, làm chậm về trễ 😎",
        "Job 2 tiếng chill chill"
      ]
    },
    friends: {
      titles: ["Ủa bạn bè tui đâu hết rồi ta 🤔"],
      descs: ["Rủ tụi nó vào làm chung cho đỡ chán đi"],
      icon: FiUsers,
      suggests: [
        "Kêu tụi bạn vào làm 😏",
        "Việc cho người quen thôi",
        "Team mình làm cho vui vui nào",
        "Share story kéo người 👀"
      ]
    },
  },

  plan: {
    hot: {
      titles: ["Chưa có kèo nào cháy 🔥"],
      descs: ["Lên kèo đi, biết đâu thành tụ điểm ăn chơi luôn 😏"],
      icon: FiZap,
      suggests: [
        "Cafe sáng tám chuyện chill chill ☕",
        "Nhậu nhẹ thôi nha mấy ba 🍻",
        "Boardgame thua trả tiền nào 😏",
        "Phượt Vũng tàu nhẹ cái cho đã 🏍️"
      ]
    },
    near: {
      titles: ["Ê khu này im ắng quá nghe 🤨"],
      descs: ["Rủ kèo phát cho xôm tụ lại coi"],
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
      descs: ["Bạn mở màn đi, mọi người vào liền đó"],
      icon: FiClock,
      suggests: [
        "Kèo tối nay Q1 luôn không tụi bây 🍻",
        "Đi ăn không đặt bàn nhanh nào 😤",
        "Tối xem C1 trận MU - Ars nào 🤡",
        "Ê tự nhiên muốn đi đảo khỉ Cần Giờ  🐒"
      ]
    },
    friends: {
      titles: ["Mấy đưa đâu rồi vào nhanh 😏"],
      descs: ["Gọi hội vào làm kèo cho vui nào"],
      icon: FiUserPlus,
      suggests: [
        "Mai sinh nhật tao làm lớn đê 🎂",
        "Nhà ai có cơm cho tui ăn ké 😆",
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