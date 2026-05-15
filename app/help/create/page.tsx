"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FiBriefcase, FiCalendar, FiChevronDown, FiArrowLeft, FiZap, FiUsers, FiDollarSign, FiClock, FiMapPin, FiHelpCircle, FiTrendingUp } from "react-icons/fi";
import LottiePlayer from "@/components/ui/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

const CASES = [
  { type: "task", title: "Shipper giao hàng gấp", desc: "50k • Q1 → Q7 • 2h", icon: FiBriefcase, color: "#0042B2", bg: "from-[#0042B2]/10 to-[#1A5FFF]/10" },
  { type: "plan", title: "Team đi ăn lẩu cuối tuần", desc: "10 người • Share bill • T7", icon: FiCalendar, color: "#00C853", bg: "from-[#00C853]/10 to-[#00E676]/10" },
  { type: "task", title: "Design logo cho shop", desc: "500k • 2 option • 3 ngày", icon: FiBriefcase, color: "#0042B2", bg: "from-[#0042B2]/10 to-[#1A5FFF]/10" },
  { type: "plan", title: "Workshop Figma newbie", desc: "Free • 20 slot • CN", icon: FiCalendar, color: "#00C853", bg: "from-[#00C853]/10 to-[#00E676]/10" },
];

const COMPARISON = [
  { label: "Vai trò", task: "Người thuê", plan: "Người tổ chức", icon: FiUsers },
  { label: "Người khác", task: "Người làm", plan: "Người tham gia", icon: FiZap },
  { label: "Chi phí", task: "Bạn trả", plan: "Share / Free", icon: FiDollarSign },
  { label: "Thời gian", task: "Deadline", plan: "Lịch hẹn", icon: FiClock },
  { label: "Địa điểm", task: "Online/Offline", plan: "Địa điểm cụ thể", icon: FiMapPin },
];

const STEPS = {
  task: ["Mô tả công việc rõ ràng", "Đặt giá + số người cần", "Chọn deadline", "Đăng & chờ ứng tuyển"],
  plan: ["Tên hoạt động + mô tả", "Chọn ngày giờ + địa điểm", "Set số người + chi phí", "Đăng & mời bạn bè"],
};

export default function CreateHelpPage() {
  const [activeTab, setActiveTab] = useState<"compare" | "cases">("compare");
  const [openStep, setOpenStep] = useState<"task" | "plan" | null>("task");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/create" className="w-9 h-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center -ml-1 active:scale-95 transition-all">
            <FiArrowLeft size={20} className="text-zinc-700 dark:text-zinc-300" />
          </Link>
          <div>
            <h1 className="text-lg font-black tracking-tight">Chọn loại bài đăng</h1>
            <p className="text-xs text-zinc-500 -mt-0.5">Công việc hay Kế hoạch?</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  className="flex flex-col items-center justify-center py-6"
>
  <LottiePlayer
    animationData={loadingPull}
    loop
    autoplay
    className="w-28 h-28"
  />

  <h2 className="text-xl font-black mt-2 text-zinc-900 dark:text-white">
    Chưa biết chọn gì?
  </h2>

  <p className="text-sm text-zinc-500 text-center mt-1 max-w-sm">
    So sánh nhanh giữa Công việc và Kế hoạch để đăng đúng loại bài phù hợp nhất.
  </p>
</motion.div>
        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl grid-cols-2 gap-1">
            {[
              { id: "compare", label: "So sánh", icon: FiHelpCircle },
              { id: "cases", label: "Ví dụ thực tế", icon: FiTrendingUp },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === tab.id? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === "compare"? (
            <motion.div key="compare" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="space-y-5">
              {/* Comparison Table */}
              <div className="bg-white dark:bg-zinc-950 rounded-3xl border-zinc-200/60 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-900">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">So sánh</div>
                  <div className="flex items-center gap-1.5 text-sm font-black text-[#0042B2]"><FiBriefcase size={16} />Công việc</div>
                  <div className="flex items-center gap-1.5 text-sm font-black text-[#00C853]"><FiCalendar size={16} />Kế hoạch</div>
                </div>
                {COMPARISON.map((row, idx) => (
                  <motion.div key={row.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="grid grid-cols-3 gap-4 p-4 border-b border-zinc-100 dark:border-zinc-900/50 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      <row.icon size={14} className="text-zinc-400" />
                      {row.label}
                    </div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">{row.task}</div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">{row.plan}</div>
                  </motion.div>
                ))}
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {(["task", "plan"] as const).map((type) => (
                  <motion.div key={type} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: type === "plan"? 0.1 : 0 }} className="bg-white dark:bg-zinc-950 rounded-3xl border-zinc-200/60 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <button onClick={() => setOpenStep(openStep === type? null : type)} className="w-full p-5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${type === "task"? "bg-[#E8F1FF] dark:bg-[#0042B2]/20" : "bg-[#E8F5E9] dark:bg-[#00C853]/20"}`}>
                          {type === "task"? <FiBriefcase className="text-[#0042B2]" size={20} /> : <FiCalendar className="text-[#00C853]" size={20} />}
                        </div>
                        <div className="text-left">
                          <h3 className="font-black text-base">Cách tạo {type === "task"? "Công việc" : "Kế hoạch"}</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">{STEPS[type].length} bước • 2 phút</p>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: openStep === type? 180 : 0 }}><FiChevronDown className="text-zinc-400" size={20} /></motion.div>
                    </button>
                    <AnimatePresence>
                      {openStep === type && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-5 pb-5 space-y-3">
                            {STEPS[type].map((step, i) => (
                              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-3">
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center mt-0.5 ${type === "task"? "bg-[#0042B2]" : "bg-[#00C853]"}`}>{i + 1}</div>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed pt-0.5">{step}</p>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="cases" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">
              <div className="text-center mb-1">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Chọn ví dụ để tạo nhanh</p>
              </div>
              {CASES.map((item, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Link href={`/create/${item.type}?template=${idx}`} className="block group">
                    <div className="p-5 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200/60 dark:border-zinc-800 hover:border-transparent hover:shadow-xl hover:shadow-black/5 active:scale-[0.98] transition-all">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
                          <item.icon style={{ color: item.color }} size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <h3 className="font-bold text-zinc-900 dark:text-white leading-tight">{item.title}</h3>
                            <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0" style={{ background: `${item.color}15`, color: item.color }}>{item.type === "task"? "Công việc" : "Kế hoạch"}</span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</p>
                        </div>
                        <FiChevronDown className="text-zinc-300 -rotate-90 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" size={20} />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="pt-4">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 flex gap-3">
                  <FiZap className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Mẹo</p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">Mô tả càng chi tiết, càng nhanh có người nhận. Thêm ảnh minh họa tăng 3x tỷ lệ thành công!</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8 grid grid-cols-2 gap-3">
          <Link href="/create/task" className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] rounded-2xl" />
            <div className="relative h-14 rounded-2xl flex items-center justify-center gap-2 text-white font-bold shadow-lg shadow-[#0042B2]/25 group-active:scale-95 transition-transform">
              <FiBriefcase size={18} />
              <span>Tạo Công việc</span>
            </div>
          </Link>
          <Link href="/create/plan" className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00C853] to-[#00E676] rounded-2xl" />
            <div className="relative h-14 rounded-2xl flex items-center justify-center gap-2 text-white font-bold shadow-lg shadow-[#00C853]/25 group-active:scale-95 transition-transform">
              <FiCalendar size={18} />
              <span>Tạo Kế hoạch</span>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}