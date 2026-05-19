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
  warningAt,
  onClose,
}: Props) {
  const auth = getFirebaseAuth();

  const db = useMemo(() => getFirebaseDB(), []);

  const [user] = useAuthState(auth);

  const [userData, setUserData] = useState<UserData | null>(null);

  const [loading, setLoading] = useState(true);

  const [appealText, setAppealText] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [hasAppealed, setHasAppealed] = useState(false);

  const [showAppealForm, setShowAppealForm] = useState(false);

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

  const warningDate = warningAt?.toDate?.()
    ? warningAt.toDate()
    : warningAt
    ? new Date(warningAt)
    : new Date();

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