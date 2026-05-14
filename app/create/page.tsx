"use client";
import Link from "next/link";
import { FiBriefcase, FiCalendar, FiArrowRight, FiZap, FiHelpCircle } from "react-icons/fi";
import { motion } from "framer-motion";

const OPTIONS = [
  {
    id: "task",
    title: "Công việc",
    desc: "Thuê người làm, ship hàng, freelance, part-time",
    icon: FiBriefcase,
    href: "/create/task",
    color: "#0042B2",
    bg: "from-[#0042B2] to-[#1A5FFF]",
    lightBg: "bg-[#E8F1FF] dark:bg-[#0042B2]/10",
  },
  {
    id: "plan",
    title: "Kế hoạch",
    desc: "Hẹn hò, offline, sự kiện, du lịch, workshop",
    icon: FiCalendar,
    href: "/create/plan",
    color: "#00C853",
    bg: "from-[#00C853] to-[#00E676]",
    lightBg: "bg-[#E8F5E9] dark:bg-[#00C853]/10",
  },
];

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center">
      <div className="w-full max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-zinc-950 border-zinc-200/60 dark:border-zinc-800 shadow-sm mb-6">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#0042B2] to-[#00C853] flex items-center justify-center">
              <FiZap className="text-white" size={12} />
            </div>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Tạo bài đăng mới</span>
          </motion.div>

          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2.5">Bạn muốn tạo gì?</h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">Chọn loại nội dung phù hợp nhất</p>
        </motion.div>

        {/* Options */}
        <div className="space-y-3.5">
          {OPTIONS.map((opt, idx) => (
            <motion.div key={opt.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + idx * 0.1 }}>
              <Link href={opt.href} className="block group">
                <div className="relative p-[2px] rounded-3xl bg-zinc-200 dark:bg-zinc-800 group-hover:bg-gradient-to-br group-hover:from-[#0042B2]/50 group-hover:to-[#00C853]/50 transition-all duration-300">
                  <div className="relative bg-white dark:bg-zinc-950 rounded-3xl p-6 group-hover:shadow-xl group-active:scale-[0.99] transition-all">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${opt.lightBg} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0`}>
                        <opt.icon style={{ color: opt.color }} size={26} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <h3 className="text-xl font-black text-zinc-900 dark:text-white">{opt.title}</h3>
                          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-900 group-hover:bg-zinc-900 dark:group-hover:bg-white flex items-center justify-center transition-colors flex-shrink-0">
                            <FiArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white dark:group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{opt.desc}</p>
                      </div>
                    </div>

                    {/* Hover gradient */}
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${opt.bg} opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none`} />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Help */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-10">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border-zinc-200/60 dark:border-zinc-800 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <FiHelpCircle size={16} className="text-zinc-400" />
              <span>Không chắc chắn?</span>
              <Link href="/help/create" className="font-bold text-[#0042B2] hover:underline">Xem hướng dẫn chi tiết</Link>
            </div>
          </div>
        </motion.div>

        {/* Quick stats */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8 grid-cols-3 gap-3">
          {[
            { label: "Công việc", value: "12.5K+" },
            { label: "Kế hoạch", value: "8.3K+" },
            { label: "Thành công", value: "94%" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-2xl bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
              <p className="text-lg font-black text-zinc-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}