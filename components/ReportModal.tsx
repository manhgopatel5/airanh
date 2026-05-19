"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Shield,
  Megaphone,
  UserX,
  Ban,
  Flame,
  HelpCircle,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { getFirebaseDB } from "@/lib/firebase";

import { toast, Toaster } from "sonner";

import { motion, AnimatePresence } from "framer-motion";

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetType: "user" | "task" | "comment";
  targetId: string;
  targetName: string;
  targetShortId?: string | undefined;
  targetAvatar?: string | undefined;
  fromUid: string;
  fromName: string;
};

const REPORT_REASONS = [
  {
    id: "spam",
    label: "Spam / Quảng cáo",
    icon: Megaphone,
    color: "text-yellow-600",
  },

  {
    id: "fake",
    label: "Tài khoản giả mạo",
    icon: UserX,
    color: "text-purple-600",
  },

  {
    id: "quay_roi",
    label: "Quấy rối / Bắt nạt",
    icon: Ban,
    color: "text-red-600",
  },

  {
    id: "adult",
    label: "Nội dung 18+",
    icon: Shield,
    color: "text-pink-600",
  },

  {
    id: "violence",
    label: "Bạo lực / Nguy hiểm",
    icon: Flame,
    color: "text-orange-600",
  },

  {
    id: "other",
    label: "Lý do khác",
    icon: HelpCircle,
    color: "text-gray-600",
  },
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

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setReason("");
        setNote("");
        setSuccess(false);
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () =>
      window.removeEventListener(
        "keydown",
        handleEsc
      );
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";

      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";

      document.body.style.touchAction = "";
    }

    return () => {
      document.body.style.overflow = "";

      document.body.style.touchAction = "";
    };
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Vui lòng chọn lý do báo cáo");

      navigator.vibrate?.(10);

      return;
    }

    if (
      reason === "other" &&
      note.trim().length < 10
    ) {
      toast.error(
        "Vui lòng mô tả chi tiết ít nhất 10 ký tự"
      );

      navigator.vibrate?.(10);

      return;
    }

    if (
      fromUid === targetId &&
      targetType === "user"
    ) {
      toast.error(
        "Bạn không thể tự báo cáo chính mình"
      );

      return;
    }

    setLoading(true);

    try {
      const db = getFirebaseDB();

      const q = query(
        collection(db, "reports"),

        where("from", "==", fromUid),

        where("targetId", "==", targetId),

        where("type", "==", targetType)
      );

      const snap = await getDocs(q);

      const last24h =
        Date.now() - 24 * 60 * 60 * 1000;

      const hasRecent = snap.docs.some((d) => {
        const createdAt =
          d.data().createdAt?.toMillis?.() || 0;

        return createdAt > last24h;
      });

      if (hasRecent) {
        toast.warning(
          "Bạn đã báo cáo nội dung này trong 24h qua"
        );

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

        userAgent: navigator.userAgent.slice(
          0,
          200
        ),
      });

      navigator.vibrate?.([10, 50, 10]);

      setSuccess(true);

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);

      toast.error(
        "Gửi báo cáo thất bại. Vui lòng thử lại"
      );

      navigator.vibrate?.(10);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Toaster
            richColors
            position="top-center"
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-xl"
          />

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
              y: 30,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.96,
              y: 30,
            }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 340,
            }}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
          >
            <div
              ref={modalRef}
              tabIndex={-1}
              className="bg-white dark:bg-zinc-950 rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full sm:max-w-md max-h-[92vh] sm:max-h-[88vh] pointer-events-auto flex flex-col overflow-hidden"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center">
                    <AlertTriangle
                      className="w-6 h-6 text-red-500"
                      strokeWidth={2.5}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold">
                      Báo cáo vi phạm
                    </h3>

                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      Giúp cộng đồng an toàn hơn
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {success ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 px-6">
                  <motion.div
                    initial={{
                      scale: 0,
                      rotate: -20,
                    }}
                    animate={{
                      scale: 1,
                      rotate: 0,
                    }}
                    transition={{
                      type: "spring",
                      damping: 14,
                      stiffness: 300,
                    }}
                    className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mb-5"
                  >
                    <Check
                      className="w-12 h-12 text-green-500"
                      strokeWidth={3}
                    />
                  </motion.div>

                  <p className="text-xl font-bold mb-1">
                    Đã gửi báo cáo
                  </p>

                  <p className="text-sm text-zinc-500 text-center">
                    Cảm ơn bạn. Đội ngũ sẽ xem xét sớm nhất
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="space-y-3">
                      {REPORT_REASONS.map((item) => {
                        const Icon = item.icon;

                        const active =
                          reason === item.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              setReason(item.id)
                            }
                            className={`w-full flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.98] ${
                              active
                                ? "border-red-500 bg-red-50 dark:bg-red-500/10"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            }`}
                          >
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                                active
                                  ? "bg-red-500 text-white"
                                  : "bg-zinc-100 dark:bg-zinc-800"
                              }`}
                            >
                              <Icon
                                className={`w-5 h-5 ${
                                  !active
                                    ? item.color
                                    : ""
                                }`}
                              />
                            </div>

                            <div className="flex-1">
                              <p className="font-medium">
                                {item.label}
                              </p>
                            </div>

                            {active && (
                              <Check
                                className="w-5 h-5 text-red-500"
                                strokeWidth={3}
                              />
                            )}
                          </button>
                        );
                      })}

                      {reason === "other" && (
                        <motion.textarea
                          initial={{
                            opacity: 0,
                            height: 0,
                          }}
                          animate={{
                            opacity: 1,
                            height: 120,
                          }}
                          exit={{
                            opacity: 0,
                            height: 0,
                          }}
                          value={note}
                          onChange={(e) =>
                            setNote(
                              e.target.value
                            )
                          }
                          placeholder="Mô tả chi tiết..."
                          aria-label="Mô tả chi tiết báo cáo"
                          className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-red-500"
                        />
                      )}
                    </div>
                  </div>

                  <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 flex gap-3 shrink-0">
                    <button
                      onClick={onClose}
                      disabled={loading}
                      className="flex-1 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-700 font-medium active:scale-[0.98] transition"
                    >
                      Hủy
                    </button>

                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex-1 h-12 rounded-2xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang gửi
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4" />
                          Gửi báo cáo
                        </>
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