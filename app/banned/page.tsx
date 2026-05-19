"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  Ban,
  Clock,
  Send,
  CheckCircle2,
  Loader2,
  AlertCircle,
  MessageSquare,
  Shield,
  XCircle,
  Sparkles,
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

export default function BannedPage() {
  const params = useSearchParams();
  const auth = getFirebaseAuth();
  const db = useMemo(() => getFirebaseDB(), []);
  const [user] = useAuthState(auth);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [appealText, setAppealText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasAppealed, setHasAppealed] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);

  const until = params.get("until");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        setUserData(userDoc.data() as UserData);
      }

      const appealQuery = query(
        collection(db, "appeals"),
        where("userId", "==", user.uid),
        where("status", "==", "pending")
      );

      const appealSnap = await getDocs(appealQuery);

      setHasAppealed(!appealSnap.empty);
      setLoading(false);

      navigator.vibrate?.(10);
    };

    fetchData();
  }, [user, db]);

  const handleAppeal = async () => {
    if (
      !user ||
      !appealText.trim() ||
      appealText.trim().length < 20
    ) {
      toast.error("Nội dung kháng cáo phải ít nhất 20 ký tự");
      navigator.vibrate?.(15);
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, "appeals"), {
        userId: user.uid,
        userName: user.displayName || "Unknown",
        userEmail: user.email,
        reason: userData?.bannedReason || "Không rõ",
        appealText: appealText.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        violationCount: userData?.violationCount || 0,
      });

      toast.success("Đã gửi kháng cáo • Admin xem xét 24-48h");

      setHasAppealed(true);
      setShowAppealForm(false);
      setAppealText("");

      navigator.vibrate?.([10, 20, 10]);
    } catch (err) {
      toast.error("Gửi kháng cáo thất bại");
      navigator.vibrate?.(15);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F2F2F7] dark:bg-black">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-[#0a84ff]/10 flex items-center justify-center">
            <Loader2
              size={32}
              className="animate-spin text-[#0a84ff]"
            />
          </div>

          <p className="text-sm font-medium text-zinc-500">
            Đang tải...
          </p>
        </motion.div>
      </div>
    );
  }

  const banEndDate = until
    ? new Date(Number(until))
    : userData?.bannedUntil?.toDate?.()
    ? userData.bannedUntil.toDate()
    : userData?.bannedUntil
    ? new Date(userData.bannedUntil)
    : null;

  const isPermanent = !banEndDate;

  const violationCount = userData?.violationCount || 0;

  const daysLeft = banEndDate
    ? Math.max(
        0,
        Math.ceil(
          (banEndDate.getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <Toaster richColors position="top-center" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
          }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl"
        />

        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
          }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
          scale: 0.95,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
        }}
        className="relative w-full max-w-[420px]"
      >
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="relative h-48 bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />

            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute -top-20 -right-20 w-40 h-40 border border-white/20 rounded-full"
            />

            <div className="relative h-full flex flex-col items-center justify-center text-white p-8">
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
                  delay: 0.2,
                  stiffness: 200,
                }}
                className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full grid place-items-center mb-4 ring-4 ring-white/20"
              >
                <Ban size={40} strokeWidth={2} />
              </motion.div>

              <h1 className="text-2xl font-bold tracking-tight">
                Tài khoản bị hạn chế
              </h1>

              <p className="text-white/80 text-sm mt-1 font-medium">
                Vi phạm lần {violationCount}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden rounded-3xl"
            >
              <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10" />

              <div className="relative p-4 flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 grid place-items-center flex-shrink-0">
                  <AlertCircle
                    size={20}
                    className="text-red-600 dark:text-red-400"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                    Lý do
                  </p>

                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
                    {userData?.bannedReason ||
                      "Vi phạm quy định cộng đồng"}
                  </p>
                </div>
              </div>
            </motion.div>