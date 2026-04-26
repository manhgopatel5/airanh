"use client";
import { motion } from "framer-motion";
import { HiPlus, HiArrowPath } from "react-icons/hi2";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TabId = "hot" | "near" | "new" | "friends";

const messages = {
  hot: {
    title: "Chưa có gì bùng nổ",
    desc: "Hãy là người đầu tiên tạo trend\nvà nhận ngàn like",
    emoji: "🔥",
    gradient: "from-orange-500 via-red-500 to-pink-500"
  },
  near: {
    title: "Quanh đây trống quá",
    desc: "Tạo việc gần bạn để\nkết nối với hàng xóm",
    emoji: "📍",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500"
  },
  new: {
    title: "Chưa có việc mới",
    desc: "Đăng việc đầu tiên\ngiành slot hot",
    emoji: "✨",
    gradient: "from-blue-500 via-indigo-500 to-violet-500"
  },
  friends: {
    title: "Bạn bè chưa đăng gì",
    desc: "Mời bạn bè vào\nđăng việc kiếm tiền chung",
    emoji: "👥",
    gradient: "from-purple-500 via-pink-500 to-rose-500"
  },
};

type Props = {
  tab: TabId;
  onRefresh?: () => void;
};

export default function EmptyState({ tab, onRefresh }: Props) {
  const router = useRouter();
  const msg = messages[tab];
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center min-h-[60vh]">
      {/* Floating emoji với shadow */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1
        }}
        className="relative mb-8"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${msg.gradient} blur-3xl opacity-30 animate-pulse`} />
        <div className="relative text-8xl drop-shadow-2xl">
          {msg.emoji}
        </div>
      </motion.div>

      {/* Title gradient */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="mb-3"
      >
        <h3 className={`text-2xl font-black bg-gradient-to-r ${msg.gradient} bg-clip-text text-transparent`}>
          {msg.title}
        </h3>
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="text-sm text-gray-500 dark:text-zinc-400 mb-10 whitespace-pre-line leading-relaxed"
      >
        {msg.desc}
      </motion.p>

      {/* Buttons */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring" }}
        className="flex gap-3"
      >
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-5 py-3 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold text-sm active:scale-95 transition-all flex items-center gap-2"
          >
            <HiArrowPath size={18} />
            Làm mới
          </button>
        )}

        <motion.button
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          onClick={() => router.push("/create")}
          className="relative px-6 py-3 rounded-2xl font-black text-sm text-white overflow-hidden group active:scale-95 transition-all"
        >
          {/* Gradient bg */}
          <div className={`absolute inset-0 bg-gradient-to-r ${msg.gradient}`} />

          {/* Shine effect */}
          <motion.div
            animate={{ x: isPressed? 200 : -200 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
          />

          {/* Glow */}
          <div className={`absolute inset-0 bg-gradient-to-r ${msg.gradient} blur-xl opacity-50 group-hover:opacity-70 transition-opacity`} />

          <span className="relative flex items-center gap-2">
            <HiPlus size={20} strokeWidth={3} />
            Đăng việc ngay
          </span>
        </motion.button>
      </motion.div>

      {/* Decorative dots */}
      <div className="flex gap-2 mt-12 opacity-20">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3
            }}
            className={`w-2 h-2 rounded-full bg-gradient-to-r ${msg.gradient}`}
          />
        ))}
      </div>
    </div>
  );
}