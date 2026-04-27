"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiCalendar, FiMapPin, FiUsers, FiClock, FiImage, FiX } from "react-icons/fi";
import { HiPlus } from "react-icons/hi2";
import { toast, Toaster } from "sonner";
import { motion } from "framer-motion";

export default function CreatePlanPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [time, setTime] = useState("");
  const [maxPeople, setMaxPeople] = useState(4);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error("Nhập tên hoạt động");
    if (!location.trim()) return toast.error("Nhập địa điểm");
    if (!time) return toast.error("Chọn thời gian");

    setLoading(true);
    try {
      // TODO: call API tạo plan
      await new Promise(r => setTimeout(r, 1000));
      toast.success("Tạo kế hoạch thành công!");
      router.push("/plan");
    } catch (e) {
      toast.error("Tạo thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-24">
        {/* HEADER */}
        <div className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <FiX size={24} />
          </button>
          <h1 className="font-bold text-lg flex-1">Tạo kế hoạch</h1>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="px-4 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all active:scale-95"
          >
            {loading ? "Đang tạo..." : "Đăng"}
          </button>
        </div>

        <div className="max-w-xl mx-auto p-4 space-y-4">
          {/* TITLE */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-200 dark:border-zinc-800"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 dark:bg-green-400/15 flex items-center justify-center">
                <FiCalendar className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-50">Hoạt động gì?</span>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Cafe sáng T7, Nhậu tối nay..."
              className="w-full px-0 py-2 text-base bg-transparent border-0 outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-600"
              maxLength={100}
            />
            <div className="text-xs text-gray-400 mt-1">{title.length}/100</div>
          </motion.div>

          {/* DESC */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-200 dark:border-zinc-800"
          >
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2 block">
              Mô tả chi tiết
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Mô tả thêm về hoạt động, yêu cầu..."
              rows={4}
              className="w-full px-0 py-2 text-sm bg-transparent border-0 outline-none resize-none placeholder:text-gray-400 dark:placeholder:text-zinc-600"
              maxLength={500}
            />
            <div className="text-xs text-gray-400 mt-1">{desc.length}/500</div>
          </motion.div>

          {/* LOCATION */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-200 dark:border-zinc-800"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 dark:bg-green-400/15 flex items-center justify-center">
                <FiMapPin className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-50">Địa điểm</span>
            </div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="VD: Cafe Landmark 81, Công viên Tao Đàn..."
              className="w-full px-0 py-2 text-base bg-transparent border-0 outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-600"
            />
          </motion.div>

          {/* TIME + PEOPLE */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <FiClock className="text-green-600 dark:text-green-400" size={18} />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">Thời gian</span>
              </div>
              <input
                type="datetime-local"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-sm bg-transparent border-0 outline-none"
              />
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <FiUsers className="text-green-600 dark:text-green-400" size={18} />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">Số người</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMaxPeople(Math.max(2, maxPeople - 1))}
                  className="w-8 h-8 rounded-lg bg-green-500/10 dark:bg-green-400/15 text-green-600 dark:text-green-400 font-bold active:scale-95"
                >
                  -
                </button>
                <span className="flex-1 text-center font-bold text-gray-900 dark:text-gray-50">
                  {maxPeople}
                </span>
                <button
                  onClick={() => setMaxPeople(Math.min(50, maxPeople + 1))}
                  className="w-8 h-8 rounded-lg bg-green-500/10 dark:bg-green-400/15 text-green-600 dark:text-green-400 font-bold active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          </motion.div>

          {/* UPLOAD */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border-2 border-dashed border-gray-300 dark:border-zinc-700"
          >
            <button className="w-full py-6 flex flex-col items-center gap-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
              <FiImage size={32} />
              <span className="text-sm font-medium">Thêm ảnh cover</span>
            </button>
          </motion.div>
        </div>
      </div>
    </>
  );
}