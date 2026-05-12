"use client";
import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, Loader2, Shield, Megaphone, UserX, Ban, Flame, HelpCircle, Check } from "lucide-react";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetType: "user" | "task" | "comment";
  targetId: string;
  targetName: string;
  targetShortId?: string;
  targetAvatar?: string;
  fromUid: string;
  fromName: string;
};

const REPORT_REASONS = [
  { id: "spam", label: "Spam / Quảng cáo", icon: Megaphone, color: "text-yellow-600" },
  { id: "fake", label: "Tài khoản giả mạo", icon: UserX, color: "text-purple-600" },
  { id: "quay_roi", label: "Quấy rối / Bắt nạt", icon: Ban, color: "text-red-600" },
  { id: "adult", label: "Nội dung 18+", icon: Shield, color: "text-pink-600" },
  { id: "violence", label: "Bạo lực / Nguy hiểm", icon: Flame, color: "text-orange-600" },
  { id: "other", label: "Lý do khác", icon: HelpCircle, color: "text-gray-600" },
];

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  targetShortId,
  targetAvatar,
  fromUid,
  fromName,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state khi đóng/mở
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setReason("");
        setNote("");
        setSuccess(false);
      }, 300);
    }
  }, [isOpen]);

  // ESC để đóng
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Focus vào modal khi mở
  useEffect(() => {
    if (isOpen) modalRef.current?.focus();
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Vui lòng chọn lý do báo cáo");
      navigator.vibrate?.(10);
      return;
    }

    if (reason === "other" && note.trim().length < 10) {
      toast.error("Vui lòng mô tả chi tiết ít nhất 10 ký tự");
      navigator.vibrate?.(10);
      return;
    }

    if (fromUid === targetId && targetType === "user") {
      toast.error("Bạn không thể tự báo cáo chính mình");
      return;
    }

    setLoading(true);
    try {
      const db = getFirebaseDB();

      // Check duplicate trong 24h
      const q = query(
        collection(db, "reports"),
        where("from", "==", fromUid),
        where("targetId", "==", targetId),
        where("type", "==", targetType)
      );
      const snap = await getDocs(q);
      const last24h = Date.now() - 24 * 60 * 60 * 1000;
      const hasRecent = snap.docs.some(d => {
        const createdAt = d.data().createdAt?.toMillis?.() || 0;
        return createdAt > last24h;
      });

      if (hasRecent) {
        toast.warning("Bạn đã báo cáo nội dung này trong 24h qua");
        onClose();
        return;
      }

      await addDoc(collection(db, "reports"), {
        type: targetType,
        targetId,
        targetName,
        targetShortId: targetShortId || "",
        targetAvatar: targetAvatar || "",
        from: fromUid,
        fromName,
        reason,
        note: note.trim() || null,
        status: "pending",
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent.slice(0, 200),
      });

      navigator.vibrate?.([10, 50, 10]);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error("Gửi báo cáo thất bại. Vui lòng thử lại");
      navigator.vibrate?.(10);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
          >
            <div
              ref={modalRef}
              tabIndex={-1}
              className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3 border-b dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Báo cáo vi phạm</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Giúp cộng đồng an toàn hơn
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {success? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 px-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4"
                  >
                    <Check className="w-8 h-8 text-green-600" />
                  </motion.div>
                  <p className="text-lg font-semibold mb-1">Đã gửi báo cáo</p>
                  <p className="text-sm text-gray-500 text-center">
                    Cảm ơn bạn. Đội ngũ sẽ xem xét sớm nhất
                  </p>
                </div>
              ) : (
                <>
                  {/* Content scroll */}
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/* Target info */}
                    <div className="mb-5 p-3.5 bg-[#F2F2F7] dark:bg-zinc-800/60 rounded-2xl border border-[#E5E5E7] dark:border-zinc-700">
                      <p className="text-xs text-[#8E8E93] mb-1.5 font-medium">
                        ĐANG BÁO CÁO
                      </p>
                      <div className="flex items-center gap-3">
                        {targetAvatar && (
                          <img
                            src={targetAvatar}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{targetName}</p>
                          {targetShortId && (
                            <p className="text-sm text-[#8E8E93]">@{targetShortId}</p>
                          )}
                        </div>
                        <span className="px-2 py-1 bg-white dark:bg-zinc-900 rounded-lg text-xs font-medium capitalize">
                          {targetType}
                        </span>
                      </div>
                    </div>

                    {/* Reasons */}
                    <div className="space-y-2 mb-5">
                      <p className="text-sm font-semibold mb-3">
                        Chọn lý do <span className="text-red-500">*</span>
                      </p>
                      {REPORT_REASONS.map((r) => {
                        const Icon = r.icon;
                        return (
                          <motion.button
                            key={r.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setReason(r.id);
                              navigator.vibrate?.(5);
                            }}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                              reason === r.id
                               ? "border-[#0a84ff] bg-[#0a84ff]/10 dark:bg-[#0a84ff]/20"
                                : "border-[#E5E5E7] dark:border-zinc-700 hover:border-[#C7C7CC] dark:hover:border-zinc-600"
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${r.color}`} strokeWidth={2.5} />
                            <span className="text-sm font-medium flex-1 text-left">
                              {r.label}
                            </span>
                            {reason === r.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-5 h-5 bg-[#0a84ff] rounded-full flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Note */}
                    <div>
                      <p className="text-sm font-semibold mb-2">
                        Thông tin bổ sung{" "}
                        {reason === "other" && <span className="text-red-500">*</span>}
                      </p>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Mô tả chi tiết để chúng tôi xử lý nhanh hơn..."
                        className="w-full px-4 py-3 border-2 border-[#E5E5E7] dark:border-zinc-700 rounded-2xl dark:bg-zinc-800 resize-none focus:ring-2 focus:ring-[#0a84ff]/20 focus:border-[#0a84ff] transition-all outline-none text-sm"
                        rows={4}
                        maxLength={500}
                      />
                      <div className="flex justify-between items-center mt-1.5">
                        <p className="text-xs text-[#8E8E93]">
                          {reason === "other" && note.length < 10
                           ? `Cần thêm ${10 - note.length} ký tự`
                            : "Không bắt buộc"}
                        </p>
                        <p className="text-xs text-[#8E8E93] font-medium">
                          {note.length}/500
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer buttons */}
                  <div className="px-5 py-4 border-t dark:border-zinc-800 flex gap-3 shrink-0">
                    <button
                      onClick={onClose}
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-[#F2F2F7] dark:bg-zinc-800 hover:bg-[#E5E5EA] dark:hover:bg-zinc-700 rounded-2xl font-semibold disabled:opacity-50 transition-all active:scale-95"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading ||!reason || (reason === "other" && note.length < 10)}
                      className="flex-1 px-4 py-3 bg-[#FF3B30] hover:bg-[#FF2D20] text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-500/30"
                    >
                      {loading? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang gửi...
                        </>
                      ) : (
                        "Gửi báo cáo"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}