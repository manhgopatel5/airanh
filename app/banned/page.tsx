"use client";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Ban, Clock, Send, CheckCircle2, Loader2, AlertCircle, MessageSquare, Shield, XCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthState } from "react-firebase-hooks/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { toast, Toaster } from "sonner";
import LottiePlayer from "@/components/ui/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

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
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) setUserData(userDoc.data() as UserData);
      const appealQuery = query(collection(db, "appeals"), where("userId", "==", user.uid), where("status", "==", "pending"));
      const appealSnap = await getDocs(appealQuery);
      setHasAppealed(!appealSnap.empty);
      setLoading(false);
      navigator.vibrate?.(10);
    };
    fetchData();
  }, [user, db]);

  const handleAppeal = async () => {
    if (!user ||!appealText.trim() || appealText.trim().length < 20) {
      toast.error("Nội dung kháng cáo phải ít nhất 20 ký tự");
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
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F2F2F7] dark:bg-black">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <LottiePlayer animationData={loadingPull} loop play className="w-20 h-20" />
        </motion.div>
      </div>
    );
  }

  const banEndDate = until? new Date(Number(until)) : userData?.bannedUntil?.toDate?.()? userData.bannedUntil.toDate() : userData?.bannedUntil? new Date(userData.bannedUntil) : null;
  const isPermanent =!banEndDate;
  const violationCount = userData?.violationCount || 0;
  const daysLeft = banEndDate? Math.max(0, Math.ceil((banEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <Toaster richColors position="top-center" />

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity }} className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }} transition={{ duration: 25, repeat: Infinity }} className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="relative w-full max-w-[420px]">
        {/* Card */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-[32px] shadow-2xl border-black/5 dark:border-white/10 overflow-hidden">
          {/* Header */}
          <div className="relative h-48 bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute -top-20 -right-20 w-40 h-40 border-white/20 rounded-full" />
            <div className="relative h-full flex-col items-center justify-center text-white p-8">
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.2, stiffness: 200 }} className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full grid place-items-center mb-4 ring-4 ring-white/20">
                <Ban size={40} strokeWidth={2} />
              </motion.div>
              <h1 className="text-2xl font-bold tracking-tight">Tài khoản bị hạn chế</h1>
              <p className="text-white/80 text-sm mt-1 font-medium">Vi phạm lần {violationCount}</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Reason */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="relative overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10" />
              <div className="relative p-4 flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 grid place-items-center flex-shrink-0">
                  <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Lý do</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug">{userData?.bannedReason || "Vi phạm quy định cộng đồng"}</p>
                </div>
              </div>
            </motion.div>

            {/* Time */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={16} className="text-zinc-500" />
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Thời hạn</p>
                </div>
                {isPermanent? (
                  <p className="text-lg font-bold text-red-600">Vĩnh viễn</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{daysLeft}</p>
                    <p className="text-xs text-zinc-500 -mt-1">ngày</p>
                  </>
                )}
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={16} className="text-zinc-500" />
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Mức độ</p>
                </div>
                <p className={`text-lg font-bold ${violationCount >= 3? "text-red-600" : violationCount === 2? "text-orange-600" : "text-amber-600"}`}>Cấp {violationCount}</p>
                <p className="text-xs text-zinc-500 -mt-1">{violationCount >= 3? "Nghiêm trọng" : "Cảnh cáo"}</p>
              </div>
            </motion.div>

            {!isPermanent && banEndDate && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center">
                <p className="text-xs text-zinc-500">Mở khóa lúc</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {banEndDate.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </motion.div>
            )}

            {/* Appeal */}
            <AnimatePresence mode="wait">
              {hasAppealed? (
                <motion.div key="appealed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative overflow-hidden rounded-3xl">
                  <div className="absolute inset-0 bg-green-500/5 dark:bg-green-500/10" />
                  <div className="relative p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-green-500/15 grid place-items-center">
                      <CheckCircle2 size={20} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white">Đã gửi kháng cáo</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">Admin sẽ phản hồi trong 24-48 giờ</p>
                    </div>
                    <Sparkles size={16} className="text-green-600 animate-pulse" />
                  </div>
                </motion.div>
              ) : showAppealForm? (
                <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold flex items-center gap-1.5"><MessageSquare size={16} className="text-[#0a84ff]" />Kháng cáo</p>
                    <button onClick={() => setShowAppealForm(false)} className="w-7 h-7 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                      <XCircle size={16} className="text-zinc-500" />
                    </button>
                  </div>
                  <div className="relative">
                    <textarea value={appealText} onChange={(e) => setAppealText(e.target.value)} placeholder="Giải thích chi tiết lý do kháng cáo..." className="w-full h-28 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-[#0a84ff]/50 rounded-3xl resize-none outline-none text-sm leading-relaxed placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-900 transition-all" maxLength={1000} autoFocus />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${appealText.length < 20? "bg-amber-500/15 text-amber-600" : "bg-green-500/15 text-green-600"}`}>{appealText.length < 20? `${20 - appealText.length}` : "✓"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAppealForm(false)} className="flex-1 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-medium active:scale-98 transition-all">Hủy</button>
                    <motion.button whileTap={{ scale: 0.98 }} onClick={handleAppeal} disabled={submitting || appealText.length < 20} className="flex-1 h-11 rounded-2xl bg-[#0a84ff] text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-lg shadow-[#0a84ff]/25">
                      {submitting? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} />Gửi</>}
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.button key="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => { setShowAppealForm(true); navigator.vibrate?.(5); }} className="w-full h-12 rounded-2xl bg-[#0a84ff] text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#0a84ff]/25 active:shadow-md transition-all">
                  <MessageSquare size={18} />
                  Gửi kháng cáo
                </motion.button>
              )}
            </AnimatePresence>

            {/* Note */}
            <div className="pt-2">
              <p className="text-[11px] leading-relaxed text-center text-zinc-500 px-4">
                Kháng cáo chỉ được chấp nhận với bằng chứng rõ ràng. Spam sẽ bị từ chối.
              </p>
            </div>
          </div>
        </div>

        {/* Floating action */}
        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => window.location.href = "/"} className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-white dark:bg-zinc-900 rounded-full shadow-xl grid place-items-center border border-black/5 dark:border-white/10">
          <XCircle size={20} className="text-zinc-400" />
        </motion.button>
      </motion.div>
    </div>
  );
}