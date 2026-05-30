"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchSignInMethodsForEmail, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FiAlertCircle, FiCheck, FiMail } from "react-icons/fi";
import HuhaLogo from "@/components/brand/HuhaLogo";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const lastEmail = localStorage.getItem("last_email");
    if (lastEmail) setEmail(lastEmail);
    window.setTimeout(() => emailRef.current?.focus(), 120);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const checkRateLimit = async (value: string) => {
    try {
      const snap = await getDoc(doc(db, "rate_limits", value));
      const lastSent = snap.exists() ? snap.data().lastResetSent?.toMillis?.() || 0 : 0;
      const diff = Date.now() - lastSent;
      return diff < 60000 ? Math.ceil((60000 - diff) / 1000) : 0;
    } catch {
      return 0;
    }
  };

  const updateRateLimit = async (value: string) => {
    try {
      await setDoc(doc(db, "rate_limits", value), { lastResetSent: serverTimestamp(), count: 1 }, { merge: true });
    } catch (err) {
      console.error("Rate limit update failed", err);
    }
  };

  const handleReset = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const normalized = email.trim().toLowerCase();

    if (!normalized) {
      setError("Vui lòng nhập email");
      emailRef.current?.focus();
      return;
    }
    if (!emailRegex.test(normalized)) {
      setError("Email không hợp lệ");
      return;
    }
    if (cooldown > 0) return;

    try {
      setChecking(true);
      setError("");
      const waitTime = await checkRateLimit(normalized);
      if (waitTime > 0) {
        setCooldown(waitTime);
        setError(`Vui lòng đợi ${waitTime}s trước khi gửi lại`);
        return;
      }

      const methods = await fetchSignInMethodsForEmail(auth, normalized);
      if (methods.length === 0) {
        setError("Email chưa đăng ký tài khoản");
        return;
      }

      setChecking(false);
      setLoading(true);
      await sendPasswordResetEmail(auth, normalized, { url: `${window.location.origin}/login` });
      await updateRateLimit(normalized);
      localStorage.setItem("last_email", normalized);
      setSent(true);
      setCooldown(60);
      toast.success("Đã gửi link đặt lại mật khẩu");
    } catch (err: any) {
      const errorMap: Record<string, string> = {
        "auth/invalid-email": "Email không hợp lệ",
        "auth/too-many-requests": "Gửi quá nhiều lần, thử lại sau",
        "auth/network-request-failed": "Lỗi mạng, kiểm tra kết nối",
      };
      setError(errorMap[err.code] || "Gửi email thất bại");
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10">
          <HuhaLogo />
        </div>

        {sent && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-6 flex items-start gap-3 rounded-2xl border border-[#34C759]/30 bg-[#34C759]/10 px-4 py-4 text-sm font-bold text-[#34C759]"
          >
            <FiCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-black">Đã gửi link đặt lại</div>
              <div className="mt-0.5 font-semibold text-[#34C759]/80">
                Kiểm tra hộp thư và thư mục Spam. Bạn có thể gửi lại sau {cooldown}s.
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Email</label>
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                ref={emailRef}
                type="email"
                autoComplete="email"
                placeholder="Email của bạn"
                value={email}
                disabled={sent && cooldown > 0}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError("");
                }}
                className={`h-14 w-full rounded-2xl border bg-zinc-50 pl-12 pr-4 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${error ? "border-red-400 focus:border-red-500" : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"}`}
              />
            </div>
          </div>

          {cooldown > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: cooldown, ease: "linear" }} className="h-full bg-[#0A84FF]" />
            </div>
          )}

          <button type="submit" disabled={loading || checking || (sent && cooldown > 0)} className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98] disabled:opacity-60">
            {checking ? "Đang kiểm tra..." : loading ? "Đang gửi..." : sent && cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi link đặt lại"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          Nhớ mật khẩu?{" "}
          <Link href="/login" className="font-black text-[#0A84FF]">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}