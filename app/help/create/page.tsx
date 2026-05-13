"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiBriefcase, FiCalendar, FiChevronDown, FiArrowLeft,
  FiZap, FiUsers, FiDollarSign, FiClock, FiMapPin, FiHelpCircle,
} from "react-icons/fi";

const CASES = [
  { type: "task", title: "Cần shipper giao hàng gấp", desc: "Bạn trả 50k cho 1 người giao từ Q1 sang Q7 trong 2h", icon: FiBriefcase },
  { type: "plan", title: "Rủ team đi ăn lẩu cuối tuần", desc: "10 người, share tiền, tối T7 ở Q1", icon: FiCalendar },
  { type: "task", title: "Thuê design logo cho shop", desc: "Budget 500k, cần 2 option, deadline 3 ngày", icon: FiBriefcase },
  { type: "plan", title: "Workshop Figma cho newbie", desc: "Miễn phí, 20 slot, chiều CN tại The Cafe", icon: FiCalendar },
];

const COMPARISON = [
  { label: "Bạn là", task: { text: "Người thuê", icon: FiBriefcase }, plan: { text: "Người tổ chức", icon: FiUsers } },
  { label: "Người khác là", task: { text: "Người làm thuê", icon: FiZap }, plan: { text: "Người tham gia", icon: FiUsers } },
  { label: "Chi phí", task: { text: "Bạn trả toàn bộ", icon: FiDollarSign }, plan: { text: "Free / Share / Bạn trả", icon: FiDollarSign } },
  { label: "Thời gian", task: { text: "Deadline hoàn thành", icon: FiClock }, plan: { text: "Ngày giờ diễn ra", icon: FiCalendar } },
  { label: "Địa điểm", task: { text: "Làm online hoặc tại chỗ", icon: FiMapPin }, plan: { text: "Địa điểm offline cụ thể", icon: FiMapPin } },
];

const STEPS = {
  task: ["Nhập tiêu đề + mô tả công việc rõ ràng", "Chọn danh mục, đặt giá + số người cần", "Set deadline + địa điểm làm việc", "Đăng & chờ người ứng tuyển"],
  plan: ["Nhập tên + mô tả hoạt động", "Chọn ngày giờ + địa điểm tổ chức", "Set số người + loại chi phí", "Đăng & mời bạn bè tham gia"],
};

export default function CreateHelpPage() {
  const [activeTab, setActiveTab] = useState<"compare" | "cases">("compare");
  const [openStep, setOpenStep] = useState<"task" | "plan" | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/80 dark:border-zinc-900 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/create" className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors active:scale-95">
            <FiArrowLeft size={20} className="text-zinc-700 dark:text-zinc-300" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Chọn loại bài đăng</h1>
            <p className="text-xs text-zinc-500">Hướng dẫn chi tiết</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mb-8">
          <div className="p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl grid grid-cols-2 gap-1">
            {[{id:"compare",label:"So sánh",icon:FiHelpCircle},{id:"cases",label:"Ví dụ",icon:FiZap}].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === tab.id? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500"}`}>
                <tab.icon size={16} />{tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === "compare"? (
            <motion.div key="compare" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}} className="space-y-6">
              <div className="rounded-3xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 overflow-hidden">
                <div className="grid grid-cols-3 bg-zinc-50 dark:bg-zinc-900/50 p-4 border-b border-zinc-200 dark:border-zinc-900">
                  <div className="text-xs font-bold text-zinc-400 uppercase">Tiêu chí</div>
                  <div className="flex items-center gap-2 text-sm font-bold" style={{color:'#0042B2'}}><FiBriefcase size={16} />Công việc</div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#00C853]"><FiCalendar size={16} />Kế hoạch</div>
                </div>
                {COMPARISON.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4 p-4 border-b border-zinc-100 dark:border-zinc-900/50 last:border-0">
                    <div className="text-sm font-medium text-zinc-500">{row.label}</div>
                    <div className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"><row.task.icon className="flex-shrink-0 mt-0.5" style={{color:'#0042B2'}} size={16} /><span>{row.task.text}</span></div>
                    <div className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"><row.plan.icon className="text-[#00C853] flex-shrink-0 mt-0.5" size={16} /><span>{row.plan.text}</span></div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {(["task","plan"] as const).map((type) => (
                  <div key={type} className="rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 overflow-hidden">
                    <button onClick={() => setOpenStep(openStep === type? null : type)} className="w-full p-5 flex items-center justify-between text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:type==="task"?'rgba(0,66,178,0.1)':'rgba(0,200,83,0.1)'}}>
                          {type === "task"? <FiBriefcase style={{color:'#0042B2'}} size={20} /> : <FiCalendar className="text-[#00C853]" size={20} />}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-white">Cách tạo {type === "task"? "Công việc" : "Kế hoạch"}</div>
                          <div className="text-xs text-zinc-500">{STEPS[type].length} bước đơn giản</div>
                        </div>
                      </div>
                      <FiChevronDown className={`text-zinc-400 transition-transform ${openStep === type? "rotate-180" : ""}`} size={20} />
                    </button>
                    <AnimatePresence>
                      {openStep === type && (
                        <motion.div initial={{height:0}} animate={{height:"auto"}} exit={{height:0}} className="overflow-hidden">
                          <div className="px-5 pb-5 space-y-3">
                            {STEPS[type].map((step, i) => (
                              <div key={i} className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{background:type==="task"?'#0042B2':'#00C853'}}>{i + 1}</div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400 pt-0.5">{step}</div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="cases" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-3">
              <p className="text-sm text-zinc-500 text-center mb-4">Click vào ví dụ để tạo nhanh</p>
              {CASES.map((item, idx) => (
                <motion.div key={idx} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:idx*0.05}}>
                  <Link href={`/create/${item.type}?template=${idx}`} className="block group">
                    <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 hover:border-transparent hover:shadow-xl transition-all active:scale-[0.98]">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{background:item.type==="task"?'rgba(0,66,178,0.1)':'rgba(0,200,83,0.1)'}}>
                          <item.icon style={{color:item.type==="task"?'#0042B2':'#00C853'}} size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-zinc-900 dark:text-white">{item.title}</h3>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:item.type==="task"?'rgba(0,66,178,0.1)':'rgba(0,200,83,0.1)',color:item.type==="task"?'#0042B2':'#00C853'}}>{item.type === "task"? "Công việc" : "Kế hoạch"}</span>
                          </div>
                          <p className="text-sm text-zinc-500">{item.desc}</p>
                        </div>
                        <FiChevronDown className="text-zinc-300 -rotate-90 group-hover:translate-x-1 transition-transform" size={20} />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}} className="mt-8 grid grid-cols-2 gap-3">
          <Link href="/create/task" className="p-4 rounded-2xl text-white text-center font-bold shadow-lg active:scale-95 transition-transform" style={{background:'linear-gradient(135deg,#0042B2,#1A5FFF)',boxShadow:'0 8px 20px rgba(0,66,178,0.3)'}}>Tạo Công việc</Link>
          <Link href="/create/plan" className="p-4 rounded-2xl text-white text-center font-bold shadow-lg active:scale-95 transition-transform" style={{background:'linear-gradient(135deg,#00C853,#00E676)',boxShadow:'0 8px 20px rgba(0,200,83,0.3)'}}>Tạo Kế hoạch</Link>
        </motion.div>
      </div>
    </div>
  );
}