"use client";
import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { FiShield, FiCheck, FiAlertTriangle, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import LottiePlayer from "@/components/ui/LottiePlayer";
import errorShake from "@/public/lotties/huha-error-shake.json";

type Props = {
  open: boolean;
  uid: string;
  reason: string;
  title?: string;
  message?: string;
  warningAt?: Timestamp | null;
  onClose?: () => void;
};

export default function WarningModal({ open, uid, reason, title, message, warningAt, onClose }: Props) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (open &&!checked) {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [open, checked]);

  useEffect(() => {
    if (!open) {
      setChecked(false);
      setLoading(false);
      setCountdown(3);
    }
  }, [open]);

  if (!open) return null;

  const warningDate = warningAt?.toDate? warningAt.toDate() : new Date();
  const canConfirm = checked && countdown === 0 &&!loading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    navigator.vibrate?.([10, 20, 10]);
    try {
      const db = getFirebaseDB();
      await updateDoc(doc(db, "users", uid), {
        warning: false,
        warningSeen: true,
        warningSeenAt: serverTimestamp(),
      });
      toast.success("Đã xác nhận cảnh cáo");
      onClose?.();
    } catch (e) {
      console.error("Update warning failed:", e);
      toast.error("Lỗi xác nhận, thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-[400px]"
          >
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 rounded-[40px] blur-2xl" />

            <div className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden">
              {/* Top accent */}
              <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

              <div className="p-7">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all"
                  aria-label="Đóng"
                >
                  <FiX size={18} className="text-zinc-400" />
                </button>

                {/* Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
                  className="relative w-24 h-24 mx-auto mb-5"
                >
                  <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-full h-full">
                    <LottiePlayer
                      animationData={errorShake}
                      loop
                      autoplay
                      className="w-full h-full"
                      aria-label="Cảnh báo"
                    />
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-[24px] font-bold text-center tracking-tight text-zinc-900 dark:text-white leading-tight"
                >
                  {title || "Cảnh báo vi phạm"}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-[15px] text-center text-zinc-500 dark:text-zinc-400 mt-1.5 leading-snug"
                >
                  {message || "Tài khoản của bạn đã vi phạm tiêu chuẩn cộng đồng"}
                </motion.p>

                {/* Warning box */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-6 relative overflow-hidden rounded-[24px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 dark:from-amber-500/5 dark:via-orange-500/5 dark:to-red-500/5" />
                  <div className="absolute inset-0 rounded-[24px] ring-1 ring-amber-500/20" />
                  <div className="relative p-5">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center shadow-lg shadow-amber-500/25 flex-shrink-0">
                        <FiShield className="text-white" size={18} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Lý do vi phạm
                          </p>
                          <div className="h-px flex-1 bg-amber-500/20" />
                        </div>
                        <p className="text-[16px] font-bold text-zinc-900 dark:text-white leading-snug">
                          {reason || "Vi phạm tiêu chuẩn cộng đồng"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2.5">
                          <div className="w-1 h-1 rounded-full bg-zinc-400" />
                          <p className="text-[12px] text-zinc-500 dark:text-zinc-500 font-medium">
                            {warningDate.toLocaleString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Warning levels */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 grid grid-cols-3 gap-2"
                >
                  {[
                    { label: "Lần 1", active: true, color: "bg-amber-500" },
                    { label: "Lần 2", active: false, color: "bg-zinc-200 dark:bg-zinc-800" },
                    { label: "Lần 3", active: false, color: "bg-zinc-200 dark:bg-zinc-800" },
                  ].map((level, i) => (
                    <div key={i} className="text-center">
                      <div className={`h-1.5 rounded-full transition-all ${level.active? level.color : level.color}`} />
                      <p className={`text-[10px] mt-1.5 font-medium ${level.active? "text-amber-600 dark:text-amber-400" : "text-zinc-400"}`}>
                        {level.label}
                      </p>
                    </div>
                  ))}
                </motion.div>

                {/* Note */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800"
                >
                  <div className="flex gap-2.5">
                    <FiAlertTriangle size={16} className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[13px] leading-[18px] text-zinc-600 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-900 dark:text-white">Lưu ý quan trọng:</span> Vi phạm lần 2 sẽ bị khóa 7 ngày. Lần 3 khóa vĩnh viễn.
                    </p>
                  </div>
                </motion.div>

                {/* Checkbox */}
                <motion.label
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border-2 border-transparent has-[:checked]:border-[#0a84ff] has-[:checked]:bg-[#0a84ff]/5 cursor-pointer active:scale-[0.99] transition-all group"
                >
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setChecked(e.target.checked);
                        navigator.vibrate?.(5);
                      }}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 rounded-lg border-2 border-zinc-300 dark:border-zinc-600 peer-checked:bg-[#0a84ff] peer-checked:border-[#0a84ff] transition-all grid place-items-center">
                      <FiCheck className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" size={12} strokeWidth={3.5} />
                    </div>
                  </div>
                  <span className="flex-1 text-[14px] font-medium leading-snug text-zinc-900 dark:text-white group-active:opacity-70 transition-opacity">
                    Tôi đã đọc, hiểu rõ và cam kết không tái phạm
                  </span>
                </motion.label>

                {/* Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="mt-5"
                >
                  <button
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="relative w-full h-[52px] rounded-2xl overflow-hidden group disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a84ff] to-[#0051d5] transition-all group-active:scale-[0.98] group-disabled:opacity-40" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a84ff] to-[#0051d5] blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
                    <div className="relative h-full flex items-center justify-center gap-2 text-white font-semibold text-[16px]">
                      {loading? (
                        <>
                          <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Đang xác nhận...
                        </>
                      ) : countdown > 0 && checked? (
                        <>Vui lòng đợi {countdown}s</>
                      ) : (
                        <>Tôi đã hiểu và đồng ý</>
                      )}
                    </div>
                  </button>
                  {!checked && (
                    <p className="text-center text-xs text-zinc-500 mt-2.5">
                      Vui lòng tick vào ô xác nhận để tiếp tục
                    </p>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}