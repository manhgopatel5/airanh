"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast, Toaster } from "sonner";
import { FiMail, FiArrowLeft, FiAlertCircle, FiSend, FiCheck, FiClock } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

export default function ForgotPasswordPage() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const redirectTo = searchParams.get("redirect") || "/login";

  useEffect(() => {
    const lastEmail = localStorage.getItem("last_email");
    if (lastEmail) setEmail(lastEmail);
    setTimeout(() => emailRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const checkRateLimit = async (email: string) => {
    try {
      const snap = await getDoc(doc(db, "rate_limits", email));
      if (snap.exists()) {
        const lastSent = snap.data().lastResetSent?.toMillis() || 0;
        const diff = Date.now() - lastSent;
        if (diff < 60000) return Math.ceil((60000 - diff) / 1000);
      }
      return 0;
    } catch { return 0; }
  };

  const updateRateLimit = async (email: string) => {
    try {
      await setDoc(doc(db, "rate_limits", email), { lastResetSent: serverTimestamp(), count: 1 }, { merge: true });
    } catch {}
  };

  const handleReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) return setError("Vui lòng nhập email"), emailRef.current?.focus();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Email không hợp lệ");
    if (cooldown > 0) return;

    try {
      setChecking(true); setError("");
      const waitTime = await checkRateLimit(email);
      if (waitTime > 0) { setCooldown(waitTime); setError(`Vui lòng đợi ${waitTime}s`); return; }

      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (!methods.length) { setError("Email chưa đăng ký tài khoản"); return; }

      setChecking(false); setLoading(true);
      await sendPasswordResetEmail(auth, email, { url: `${window.location.origin}${redirectTo}` });
      await updateRateLimit(email);
      localStorage.setItem("last_email", email);
      setSent(true); setCooldown(60);
      toast.success("Đã gửi link đặt lại mật khẩu");
      navigator.vibrate?.(8);
    } catch (err: any) {
      const errorMap: Record<string, string> = {
        "auth/invalid-email": "Email không hợp lệ",
        "auth/too-many-requests": "Gửi quá nhiều lần",
        "auth/network-request-failed": "Lỗi mạng"
      };
      setError(errorMap[err.code] || "Gửi email thất bại");
    } finally { setLoading(false); setChecking(false); }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-950 rounded-3xl shadow-xl p-6 border-zinc-200/60 dark:border-zinc-800">
            {/* Back */}
            <button onClick={() => router.back()} className="mb-5 w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center active:scale-95 transition-all">
              <FiArrowLeft className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center shadow-lg shadow-[#0042B2]/25">
                <FiMail className="text-white" size={28} />
              </motion.div>
              <h1 className="text-2xl font-black tracking-tight">Quên mật khẩu?</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5">{sent? "Kiểm tra email để đặt lại" : "Nhập email để nhận link"}</p>
            </div>

            {/* Alerts */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 flex items-start gap-2.5">
                  <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium leading-snug">{error}</p>
                </motion.div>
              )}
              {sent &&!error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-2xl bg-[#E8F1FF] dark:bg-[#0042B2]/10 border-[#0042B2]/20 flex items-start gap-2.5">
                  <FiCheck className="w-4 h-4 text-[#0042B2] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[#0042B2] font-bold">Đã gửi thành công!</p>
                    <p className="text-xs text-[#0042B2]/80 mt-0.5">Kiểm tra hộp thư và mục Spam</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <div className="relative group">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 group-focus-within:text-[#0042B2] transition-colors" />
                  <input ref={emailRef} type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }} placeholder="Email của bạn" autoComplete="email" disabled={sent && cooldown > 0} className={`w-full h-12 pl-11 pr-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 ${error? "border-red-500" : "border-transparent focus:border-[#0042B2]"} outline-none text- font-medium transition-all disabled:opacity-60`} />
                </div>
              </div>

              {/* Cooldown */}
              <AnimatePresence>
                {cooldown > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 flex items-center gap-1.5"><FiClock size={14} />Có thể gửi lại sau</span>
                      <span className="font-bold text-[#0042B2]">{cooldown}s</span>
                    </div>
                    <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: cooldown, ease: "linear" }} className="h-full bg-[#0042B2] rounded-full" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button type="submit" whileTap={{ scale: 0.98 }} disabled={loading || checking || (sent && cooldown > 0)} className="w-full h-12 rounded-2xl bg-[#0042B2] text-white font-bold text- shadow-lg shadow-[#0042B2]/25 hover:shadow-xl hover:shadow-[#0042B2]/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {checking || loading? (
                  <>
                    <LottiePlayer animationData={loadingPull} loop autoplay className="w-5 h-5" />
                    <span>{checking? "Đang kiểm tra..." : "Đang gửi..."}</span>
                  </>
                ) : cooldown > 0? (
                  <>
                    <FiSend size={18} />
                    <span>Gửi lại sau {cooldown}s</span>
                  </>
                ) : (
                  <>
                    <FiSend size={18} />
                    <span>Gửi link đặt lại</span>
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                Nhớ mật khẩu? <Link href={`/login${redirectTo!== "/login"? `?redirect=${redirectTo}` : ""}`} className="font-bold text-[#0042B2] hover:underline">Đăng nhập</Link>
              </p>
            </div>
          </motion.div>

          <p className="text-center text-xs text-zinc-500 mt-4 px-4">Link có hiệu lực 1 giờ • Kiểm tra cả mục Spam</p>
        </div>
      </div>
    </>
  );
}