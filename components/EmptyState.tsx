"use client";

import { HiPlus } from "react-icons/hi2";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import LottiePlayer from "@/components/LottiePlayer";
import emptyLottie from "@/public/lotties/huha-empty.json";
import searching from "@/public/lotties/huha-searching.json";
import taskLottie from "@/public/lotties/huha-task.json";
import planLottie from "@/public/lotties/huha-plan.json";
import celebrate from "@/public/lotties/huha-celebrate.json";
import idle from "@/public/lotties/huha-idle.json";
import loadingPull from "@/public/lotties/huha-loading-pull.json";
import walletOpen from "@/public/lotties/huha-wallet-open.json";

type TabId = "hot" | "near" | "new" | "friends";
type PostType = "task" | "plan";

const CONTENT_POOL = {
  task: {
    hot: {
      titles: ["Không ai đăng hết luôn á? Ủa alo? 📢"],
      descs: ["Người khác chưa đăng vì đang chờ bạn đó 👀"],
      lottie: emptyLottie,
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
      lottie: searching,
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
      lottie: taskLottie,
      suggests: [
        "Cần người cứu gấp sắp toi rồi 🆘",
        "In tài liệu gấp, máy in tui phản chủ rồi 🖨️",
        "Làm nhanh về sớm, làm chậm về trễ 😎",
        "Chụp hình sống ảo cho tui 100 tấm 📸"
      ]
    },
    friends: {
      titles: [" Kèo người quen, tiền ít nhưng drama nhiều 🌚"],
      descs: [" Giúp nhau hôm nay, mai cưới nhớ gửi thiệp 😌"],
      lottie: planLottie,
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
      lottie: celebrate,
      suggests: [
        "Cafe sáng tám chuyện chill đê ☕",
        "Đi ăn chung cho tui đỡ ngại đi một mình 🍜",
        "Boardgame thua trả tiền nào 😏",
        "Phượt Vũng tàu nhẹ cái cho đã 🏍️"
      ]
    },
    near: {
      titles: ["Ê khu này im ắng quá nghe 🤨"],
      descs: ["Không cần đi xa, vui ngay gần nhà 😏"],
      lottie: idle,
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
      lottie: loadingPull,
      suggests: [
        "Kèo tối nay Q1 luôn không tụi bây 🍻",
        "Đi ăn không đặt bàn nhanh nào 😤",
        "Tối xem C1 trận MU - Ars nào 🤡",
        "Ê tự nhiên muốn đi đảo khỉ Cần Giờ 🐒"
      ]
    },
    friends: {
      titles: ["Mấy đứa đâu rồi vào nhanh 😏"],
      descs: ["Kèo người quen, không đi là kỳ đó 😏"],
      lottie: walletOpen,
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
    iconBg: "bg-[#0042B2]/10 dark:bg-[#0042B2]/15",
    iconColor: "text-[#0042B2] dark:text-[#5B8DEF]",
    tagBg: "bg-[#0042B2]/10 hover:bg-[#0042B2]/20 dark:bg-[#0042B2]/15 dark:hover:bg-[#0042B2]/25",
    tagText: "text-[#0042B2] dark:text-[#8FB3FF]",
    buttonBg: "bg-[#0042B2] hover:bg-[#003A9A] dark:bg-[#0042B2] dark:hover:bg-[#003A9A]",
    buttonText: "text-white",
    tabActive: "text-[#0042B2]",
    tabLine: "bg-[#0042B2]",
  },
  plan: {
    iconBg: "bg-[#00C853]/10 dark:bg-[#00C853]/15",
    iconColor: "text-[#00C853] dark:text-[#5CFF9A]",
    tagBg: "bg-[#00C853]/10 hover:bg-[#00C853]/20 dark:bg-[#00C853]/15 dark:hover:bg-[#00C853]/25",
    tagText: "text-[#00A843] dark:text-[#7CFFB2]",
    buttonBg: "bg-[#00C853] hover:bg-[#00A843] dark:bg-[#00C853] dark:hover:bg-[#00A843]",
    buttonText: "text-white",
    tabActive: "text-[#00C853]",
    tabLine: "bg-[#00C853]",
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
    lottie: pool.lottie,
    suggests: pool.suggests.slice(0, 4),
  }));

  useEffect(() => {
    setContent({
      title: pool.titles[Math.floor(Math.random() * pool.titles.length)],
      desc: pool.descs[Math.floor(Math.random() * pool.descs.length)],
      lottie: pool.lottie,
      suggests: getRandomItems(pool.suggests, 4),
    });
  }, [type, tab]);

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
        className={`w-20 h-20 rounded-2xl ${theme.iconBg} flex items-center justify-center mb-5`}
      >
        <div className="w-14 h-14">
          <LottiePlayer animationData={content.lottie} loop autoplay className="w-14 h-14" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          {content.title}
        </h3>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 whitespace-pre-line leading-relaxed max-w-xs">
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
          className={`px-5 py-2.5 rounded-xl ${theme.buttonBg} ${theme.buttonText} font-semibold text-sm flex items-center gap-2 active:scale-95 transition-all shadow-sm shadow-[#0042B2]/20`}
        >
          <HiPlus size={20} strokeWidth={2.5} />
          {type === "task"? "Đăng việc mới" : "Tạo kế hoạch"}
        </button>
      </motion.div>
    </div>
  );
}