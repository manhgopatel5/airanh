"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  Shield,
  XCircle,
  Check,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthState } from "react-firebase-hooks/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { toast, Toaster } from "sonner";

type UserData = {
  banned: boolean;
  bannedUntil?: any;
  bannedReason?: string;
  bannedAt?: any;
  violationCount?: number;
  appealSent?: boolean;
};

type Props = {
  open: boolean;
  uid: string;
  reason: string;
  title?: string;
  message?: string;
  warningAt?: any;
  onClose?: () => void;
};

export default function WarningModal({
  open,
  uid,
  reason,
  title,
  message,
  
  onClose,
}: Props) {
  const auth = getFirebaseAuth();

  const db = useMemo(() => getFirebaseDB(), []);

  const [user] = useAuthState(auth);

  const [userData, setUserData] = useState<UserData | null>(null);

  const [loading, setLoading] = useState(true);



  const [checked, setChecked] = useState(false);

  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!open || !uid) return;

    setLoading(true);

    const fetchData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));

        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }

        const appealQuery = query(
          collection(db, "appeals"),
          where("userId", "==", uid),
          where("status", "==", "pending")
        );

        const appealSnap = await getDocs(appealQuery);

        setHasAppealed(!appealSnap.empty);
      } catch (e) {
        console.error("Load warning data error:", e);
      } finally {
        setLoading(false);
        navigator.vibrate?.(10);
      }
    };

    fetchData();
  }, [open, uid, db]);

  useEffect(() => {
    if (open && !checked && countdown > 0) {
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
  }, [open, checked, countdown]);

  useEffect(() => {
    if (!open) {
      setChecked(false);
      setLoading(false);
      setCountdown(3);
      setShowAppealForm(false);
      setAppealText("");
    }
  }, [open]);

  const handleAppeal = async () => {
    setSubmitting(true);

    if (
      !user ||
      !appealText.trim() ||
      appealText.trim().length < 20
    ) {
      toast.error("Nội dung kháng cáo phải ít nhất 20 ký tự");

      navigator.vibrate?.(15);

      setSubmitting(false);

      return;
    }

    try {
      await addDoc(collection(db, "appeals"), {
        userId: user.uid,
        userName: user.displayName || "Unknown",
        userEmail: user.email,
        reason:
          userData?.bannedReason ||
          reason ||
          "Không rõ",
        appealText: appealText.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        violationCount:
          userData?.violationCount || 0,
      });

      toast.success(
        "Đã gửi kháng cáo • Admin xem xét 24-48h"
      );

      setHasAppealed(true);

      setShowAppealForm(false);

      setAppealText("");

      navigator.vibrate?.([10, 20, 10]);
    } catch (err) {
      console.error("Appeal error:", err);

      toast.error("Gửi kháng cáo thất bại");

      navigator.vibrate?.(15);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!checked || countdown > 0 || loading) {
      return;
    }

    setLoading(true);

    navigator.vibrate?.([10, 20, 10]);

    try {
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

  if (!open) return null;



  const violationCount =
    userData?.violationCount || 0;

  const canConfirm =
    checked &&
    countdown === 0 &&
    !loading;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4">
          <Toaster
            richColors
            position="top-center"
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
            onClick={onClose}
          />

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.9,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.9,
              y: 20,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
            className="relative w-full max-w-[400px]"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 rounded-[40px] blur-2xl" />

            <div className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

              <div className="p-7">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all"
                  aria-label="Đóng"
                >
                  <XCircle
                    size={18}
                    className="text-zinc-400"
                  />
                </button>

                {/* Icon thay cho Lottie */}
                <motion.div
                  initial={{
                    scale: 0,
                    rotate: -180,
                  }}
                  animate={{
                    scale: 1,
                    rotate: 0,
                  }}
                  transition={{
                    type: "spring",
                    delay: 0.1,
                    stiffness: 200,
                  }}
                  className="relative w-24 h-24 mx-auto mb-5"
                >
                  <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />

                  <div className="relative w-full h-full rounded-full bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center shadow-2xl shadow-orange-500/30">
                    <AlertTriangle
                      size={42}
                      className="text-white"
                      strokeWidth={2.5}
                    />
                  </div>
                </motion.div>
                <div className="text-center mb-5">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {title || "Cảnh cáo tài khoản"}
                  </h2>

                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                    {message ||
                      "Tài khoản của bạn đã bị cảnh cáo do vi phạm quy định cộng đồng."}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        size={18}
                        className="text-amber-500 mt-0.5"
                      />

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                          Lý do cảnh cáo
                        </p>

                        <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                          {reason}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 p-4">
                    <div className="flex items-start gap-3">
                      <Shield
                        size={18}
                        className="text-zinc-500 mt-0.5"
                      />

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                          Số lần vi phạm
                        </p>

                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {violationCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setChecked(e.target.checked)
                      }
                      className="mt-1"
                    />

                    <span className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      Tôi đã đọc và hiểu cảnh cáo này.
                    </span>
                  </label>

                  <button
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="w-full h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                  >
                    {loading ? (
                      "Đang xử lý..."
                    ) : countdown > 0 ? (
                      `Xác nhận (${countdown}s)`
                    ) : (
                      <>
                        <Check size={18} />
                        Đã hiểu
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}