"use client";

import { useState } from "react";

import {
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { getFirebaseDB } from "@/lib/firebase";

import {
  FiAlertOctagon,
  FiShield,
  FiCheck,
} from "react-icons/fi";

type Props = {
  open: boolean;

  uid: string;

  reason: string;

  title?: string;

  message?: string;

 warningAt?: Timestamp | undefined;

  onClose?: () => void;
};

export default function WarningModal({
  open,
  uid,
  reason,
  title,
  message,
  warningAt,
  onClose,
}: Props) {
  const [checked, setChecked] = useState(false);

  const [loading, setLoading] = useState(false);

  if (!open) return null;

  /* ================= DATE ================= */

  const warningDate =
    warningAt?.toDate
      ? warningAt.toDate()
      : new Date();

  /* ================= CONFIRM ================= */

  const handleConfirm = async () => {
    if (!checked || loading) return;

    setLoading(true);

    try {
      const db = getFirebaseDB();

      await updateDoc(doc(db, "users", uid), {
        warning: false,
        warningSeen: true,
        warningSeenAt: serverTimestamp(),
      });

      onClose?.();
    } catch (e) {
      console.error("Update warning failed:", e);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="fixed inset-0 z-[9999999] bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl flex items-center justify-center p-4 font-sans">
      
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] border border-[#E5E5E7] dark:border-zinc-800 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.35)] animate-in zoom-in-95 duration-300 overflow-hidden">

        <div className="p-8">

          {/* ICON */}
          <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] flex items-center justify-center mx-auto mb-6 shadow-[0_8px_24px_0_rgba(0,122,255,0.25)]">
            <FiAlertOctagon
              className="text-white"
              size={36}
              strokeWidth={2.5}
            />
          </div>

          {/* TITLE */}
          <h2 className="text-[22px] font-bold text-center text-gray-900 dark:text-white leading-tight mb-2">
            {title || "Tài khoản bị cảnh cáo"}
          </h2>

          {/* MESSAGE */}
          <p className="text-[15px] text-center text-gray-500 dark:text-zinc-400 leading-relaxed mb-6">
            {message ||
              "Bạn đã vi phạm Tiêu chuẩn cộng đồng của AIR"}
          </p>

          {/* WARNING BOX */}
          <div className="bg-gradient-to-r from-[#F0F9FF] to-[#E0F2FE] dark:from-blue-500/10 dark:to-sky-500/10 border border-[#BAE6FD] dark:border-blue-500/20 rounded-[20px] p-5 mb-6">
            
            <div className="flex items-start gap-3">

              <div className="w-8 h-8 rounded-full bg-[#007AFF] flex items-center justify-center flex-shrink-0 mt-0.5">
                <FiShield
                  className="text-white"
                  size={16}
                />
              </div>

              <div className="flex-1 min-w-0">

                <p className="text-[13px] font-semibold text-[#007AFF] dark:text-blue-400 mb-1">
                  Lý do vi phạm
                </p>

                <p className="text-[15px] font-bold text-gray-900 dark:text-white leading-snug break-words">
                  {reason || "Vi phạm tiêu chuẩn cộng đồng"}
                </p>

                <p className="text-[12px] text-gray-500 dark:text-zinc-500 mt-2">
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

          {/* NOTE */}
          <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-[20px] border border-[#E5E5E7] dark:border-zinc-700/50 p-4 mb-6">
            
            <p className="text-[13px] text-center text-gray-600 dark:text-zinc-400 leading-relaxed">
              
              <span className="font-bold text-gray-900 dark:text-white">
                Lưu ý:
              </span>{" "}
              
              Nếu tiếp tục vi phạm, tài khoản của bạn có thể bị khóa vĩnh viễn và không thể khôi phục.

            </p>

          </div>

          {/* CHECKBOX */}
          <label className="flex items-start gap-3 p-4 rounded-[20px] bg-gray-50 dark:bg-zinc-800/50 border border-[#E5E5E7] dark:border-zinc-700/50 mb-6 cursor-pointer active:scale-[0.98] transition-all">
            
            <div className="relative flex items-center justify-center mt-0.5">

              <input
                type="checkbox"
                checked={checked}
                onChange={(e) =>
                  setChecked(e.target.checked)
                }
                className="peer w-5 h-5 appearance-none rounded-lg border-2 border-[#C7C7CC] dark:border-zinc-600 checked:bg-[#007AFF] checked:border-[#007AFF] transition-all cursor-pointer"
              />

              <FiCheck
                className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                size={14}
                strokeWidth={3}
              />

            </div>

            <span className="flex-1 text-[15px] font-semibold text-gray-900 dark:text-white leading-snug">
              Tôi đã đọc và cam kết không tái phạm
            </span>

          </label>

          {/* BUTTON */}
          <button
            onClick={handleConfirm}
            disabled={!checked || loading}
            className="w-full h-14 rounded-[20px] bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] text-white font-bold text-[17px] shadow-[0_8px_24px_0_rgba(0,122,255,0.35)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >

            {loading ? (
              <div className="flex items-center justify-center gap-2">

                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />

                Đang xác nhận...

              </div>
            ) : (
              "Tôi đã hiểu và đồng ý"
            )}

          </button>

        </div>
      </div>
    </div>
  );
}