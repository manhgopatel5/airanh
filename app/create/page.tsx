"use client";
import Link from "next/link";
import { FiBriefcase, FiCalendar, FiArrowRight, FiZap } from "react-icons/fi";
import { motion } from "framer-motion";

const OPTIONS = [
  {
    id: "task",
    title: "Công việc",
    desc: "Thuê người làm, giao hàng, freelance, part-time...",
    icon: FiBriefcase,
    href: "/create/task",
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "plan",
    title: "Kế hoạch",
    desc: "Hẹn hò, offline, sự kiện, du lịch, workshop...",
    icon: FiCalendar,
    href: "/create/plan",
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    iconBg: "bg-violet-100 dark:bg-violet-900/50",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
];

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <div className="max-w-lg mx-auto px-4 pt-20 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 mb-4">
            <FiZap className="text-blue-500" size={16} />
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Bắt đầu ngay
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-2">
            Bạn muốn tạo gì?
          </h1>
          <p className="text-gray-500 dark:text-zinc-400">
            Chọn loại nội dung để bắt đầu đăng
          </p>
        </motion.div>

        <div className="space-y-4">
          {OPTIONS.map((opt, idx) => (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
            >
              <Link href={opt.href} className="block group">
                <div
                  className={`relative p-5 rounded-2xl border-2 border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-transparent hover:shadow-xl hover:shadow-${opt.id === "task" ? "blue" : "violet"}-500/20 transition-all duration-300 active:scale-[0.98]`}
                >
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${opt.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl`}
                  />
                  <div className="relative flex items-start gap-4">
                    <div
                      className={`flex-shrink-0 w-14 h-14 rounded-xl ${opt.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                    >
                      <opt.icon className={opt.iconColor} size={26} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">
                          {opt.title}
                        </h3>
                        <FiArrowRight
                          className="text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-50 group-hover:translate-x-1 transition-all"
                          size={20}
                        />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-zinc-400 line-clamp-2">
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-xs text-gray-400 dark:text-zinc-600">
            Không chắc chọn gì?{" "}
            <Link
              href="/help/create"
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              Xem hướng dẫn
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}