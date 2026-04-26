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
    gradient: "from-orange-500 via-red-500 to-pink-500",
    shadow: "shadow-[0_12px_40px_rgba(249,115,22,0.35)]"
  },
  near: {
    title: "Quanh đây trống quá",
    desc: "Tạo việc gần bạn để\nkết nối với hàng xóm",
    emoji: "📍",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    shadow: "shadow-[0_12px_40px_rgba(16,185,129,0.35)]"
  },
  new: {
    title: "Chưa có việc mới",
    desc: "Đăng việc đầu tiên\ngiành slot hot",
    emoji: "✨",
    gradient: "from-blue-500 via-indigo-500 to-violet-500",
    shadow: "shadow-[0_12px_40px_rgba(59,130,246,0.35)]"
  },
  friends: {
    title: "Bạn bè chưa đăng gì",
    desc: "Mời bạn bè vào\nđăng việc kiếm tiền chung",
    emoji: "👥",
    gradient: "from-purple-500 via-pink-500 to-rose-500",
    shadow: "shadow-[0_12px_40px_rgba(168,85,247,0.35)]"
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
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center min-h-">
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
        <div className={`absolute inset-0 bg-gradient-to-br ${msg.gradient} blur-3xl opacity-20`} />
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative text-8xl drop-shadow-2xl"
        >
          {msg.emoji}
        </motion.div>

        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2"
            animate={{
              rotate: 360,
              x: Math.cos((i * Math.PI) / 2) * 60,
              y: Math.sin((i * Math.PI) / 2) * 60,
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.5
            }}
          >
            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${msg.gradient} opacity-60`} />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="mb-3"
      >
        <h3
          className={`text-2xl font-black bg-gradient-to-r ${msg.gradient} bg-clip-text text-transparent`}
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))',
            WebkitTextStroke: '0.5px rgba(0,0,0,0.05)'
          }}
        >
          {msg.title}
        </h3>
      </motion.div>

      <motion.p
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="text-sm text-gray-500 dark:text-zinc-400 mb-10 whitespace-pre-line leading-relaxed max-w-xs"
      >
        {msg.desc}
      </motion.p>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring" }}
        className="flex gap-3 items-center"
      >
        {onRefresh && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onRefresh}
            className="px-5 py-3 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold text-sm flex items-center gap-2 shadow-md active:shadow-sm transition-shadow"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <HiArrowPath size={18} />
            </motion.div>
            Làm mới
          </motion.button>
        )}

        <motion.button
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          whileTap={{ scale: 0.92 }}
          onClick={() => router.push("/create")}
          className={`relative px-7 py-3.5 rounded-full font-black text-sm text-white overflow-hidden ${msg.shadow} transition-shadow duration-300`}
        >
          <div className={`absolute inset-0 bg-gradient-to-r ${msg.gradient}`} />

          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-full" />

          <motion.div
            animate={{ x: isPressed? "200%" : "-200%" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
          />

          <div className="absolute inset-0 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.2)]" />

          <span className="relative flex items-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            <motion.div
              animate={{ rotate: isPressed? 90 : 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <HiPlus size={20} strokeWidth={3} />
            </motion.div>
            Đăng việc ngay
          </span>
        </motion.button>
      </motion.div>

      <div className="flex gap-2 mt-14">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.2, 0.6, 0.2],
              y: [0, -8, 0]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
            className={`w-2 h-2 rounded-full bg-gradient-to-r ${msg.gradient}`}
          />
        ))}
      </div>
    </div>
  );
}