"use client";

import { useState } from "react";
import { FiX, FiCalendar } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (deadline: Date | null) => void;
  messagePreview: string;
};

export default function PinDeadlineModal({ open, onClose, onConfirm, messagePreview }: Props) {
  const [deadlineStr, setDeadlineStr] = useState("");

  const handleConfirm = () => {
    if (!deadlineStr) {
      onConfirm(null);
      return;
    }
    const d = new Date(deadlineStr);
    if (Number.isNaN(d.getTime())) return;
    onConfirm(d);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Ghim tin nhắn</h3>
              <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <FiX size={16} />
              </button>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">{messagePreview}</p>

            <label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <FiCalendar size={16} className="text-blue-500" />
              Deadline (tùy chọn)
            </label>
            <input
              type="datetime-local"
              value={deadlineStr}
              onChange={(e) => setDeadlineStr(e.target.value)}
              className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 text-sm mb-4"
            />
            <p className="text-xs text-zinc-500 mb-4">
              Ghim hiển thị ở giữa đầu trang. Gần deadline sẽ gửi thông báo cho mọi thành viên.
            </p>

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border font-semibold">
                Hủy
              </button>
              <button type="button" onClick={handleConfirm} className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-bold">
                Ghim
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
