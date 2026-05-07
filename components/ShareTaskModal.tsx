"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiShare2, FiLink, FiTwitter, FiFacebook } from "react-icons/fi";
import { TaskListItem, PlanListItem } from "@/types/task";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  task: TaskListItem | PlanListItem;
  onClose: () => void;
};

export default function ShareTaskModal({ task, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const taskUrl = `${window.location.origin}/task/${task.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(taskUrl);
      setCopied(true);
      toast.success("Đã copy link", { icon: "🔗" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Không thể copy");
    }
  };

  const handleShare = async (platform: "native" | "twitter" | "facebook") => {
    const text = `${task.title} - Xem ngay trên Airanh`;
    
    if (platform === "native" && navigator.share) {
      try {
        await navigator.share({
          title: task.title,
          text: task.description || text,
          url: taskUrl,
        });
        onClose();
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Lỗi chia sẻ");
        }
      }
      return;
    }

    let shareUrl = "";
    if (platform === "twitter") {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(taskUrl)}`;
    } else if (platform === "facebook") {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(taskUrl)}`;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Chia sẻ {task.type === "task" ? "công việc" : "kế hoạch"}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
            >
              <FiX size={20} className="text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>

          {/* Task info */}
          <div className="mb-6 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
            <p className="font-semibold text-sm text-zinc-900 dark:text-white line-clamp-2 mb-1">
              {task.title}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              bởi {task.userName}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white rounded-2xl shadow-md">
              <QRCodeSVG value={taskUrl} size={160} level="H" />
            </div>
          </div>

          {/* Link copy */}
          <div className="mb-6">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <FiLink size={18} className="text-zinc-400 shrink-0" />
              <input
                type="text"
                value={taskUrl}
                readOnly
                className="flex-1 bg-transparent text-sm text-zinc-600 dark:text-zinc-300 outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                {copied ? "Đã copy" : "Copy"}
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-3 gap-3">
            {navigator.share && (
              <button
                onClick={() => handleShare("native")}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <FiShare2 size={20} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Khác
                </span>
              </button>
            )}
            
            <button
              onClick={() => handleShare("facebook")}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center">
                <FiFacebook size={20} className="text-white" />
              </div>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Facebook
              </span>
            </button>

            <button
              onClick={() => handleShare("twitter")}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                <FiTwitter size={20} className="text-white" />
              </div>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Twitter
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}