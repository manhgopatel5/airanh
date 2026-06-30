"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiEye, FiEyeOff, FiLock, FiMail, FiSend } from "react-icons/fi";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  type Auth,
} from "firebase/auth";
import { motion } from "framer-motion";
import { toast } from "sonner";
import HuhaLogo from "@/components/brand/HuhaLogo";
import InstallPrompt from "@/components/InstallPrompt";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { getSafeRedirect } from "@/components/auth/authRoutes";
import { establishSession } from "@/lib/authSession";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginContent() {
  const searchParams = useSearchParams();

const { loading: authLoading } = useAuth();
  const authRef = useRef<Auth | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const [redirectTo, setRedirectTo] = useState("/");
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", honeypot: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const failedAttempts = useRef(0);

  // FIX 1: XÓA triggerCustomVerificationEmail - không dùng nữa
  // Gửi mail giờ do /api/send-verification lo

  useEffect(() => {
    setMounted(true);
    setRedirectTo(getSafeRedirect(searchParams.get("redirect")) || "/");
  }, [searchParams]);

  // FIX 2: XÓA useEffect redirect. Để middleware lo.
  // Chỉ giữ lại check magic link
  useEffect(() => {
    const auth = getFirebaseAuth();
    authRef.current = auth;

    const lastEmail = localStorage.getItem("last_email");
    if (lastEmail) setForm((prev) => ({...prev, email: lastEmail }));

    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email = localStorage.getItem("emailForSignIn") || lastEmail;
      if (!email) {
        setErrors({ submit: "Nhập email rồi gửi lại link đăng nhập để xác nhận thiết bị này." });
      } else {
        signInWithEmailLink(auth, email, window.location.href)
         .then(async (cred) => {
            localStorage.removeItem("emailForSignIn");
            localStorage.setItem("last_email", email);
            await establishSession(await cred.user.getIdToken());
            toast.success("Đăng nhập thành công");
            window.location.href = redirectTo;
          })
         .catch(() => setErrors({ submit: "Link đăng nhập không hợp lệ hoặc đã hết hạn" }));
      }
    }

    window.setTimeout(() => emailRef.current?.focus(), 120);
  }, []);

  const setField = (field: "email" | "password" | "honeypot", value: string) => {
    setForm((prev) => ({...prev, [field]: value }));
    if (errors[field] || errors.submit) {
      setErrors((prev) => ({...prev, [field]: "", submit: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.email) next.email = "Vui lòng nhập email";
    else if (!emailRegex.test(form.email)) next.email = "Email không hợp lệ";
    if (!form.password) next.password = "Vui lòng nhập mật khẩu";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleMagicLink = async () => {
    const auth = authRef.current;
    if (!auth) return;
    if (!form.email ||!emailRegex.test(form.email)) {
      setErrors({ email: "Nhập email hợp lệ trước" });
      emailRef.current?.focus();
      return;
    }

    try {
      setMagicLoading(true);
      setErrors({});
      await sendSignInLinkToEmail(auth, form.email, {
        url: `${window.location.origin}/login?redirect=${encodeURIComponent(redirectTo)}`,
        handleCodeInApp: true,
      });
      localStorage.setItem("emailForSignIn", form.email);
      localStorage.setItem("last_email", form.email);
      setMagicLinkSent(true);
      toast.success("Đã gửi link đăng nhập qua email");
    } catch {
      setErrors({ submit: "Gửi link thất bại. Thử lại sau." });
    } finally {
      setMagicLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const auth = authRef.current;
    if (!auth) return;

    try {
      setGoogleLoading(true);
      setErrors({});
      await setPersistence(auth, remember? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);

      localStorage.setItem("last_email", result.user.email || "");
      await establishSession(await result.user.getIdToken());
      toast.success("Đăng nhập thành công");
      window.location.href = redirectTo;
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
      const message = err.code === "auth/popup-blocked"
       ? "Popup bị chặn. Cho phép popup và thử lại."
        : err.code === "auth/unauthorized-domain"
         ? "Domain chưa được xác thực trên Firebase."
          : "Đăng nhập Google thất bại";
      setErrors({ submit: message });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (form.honeypot) return;
    const auth = authRef.current;
    if (!auth) return;

    const lastFail = localStorage.getItem("login_fail_time");
    if (failedAttempts.current >= 3 && lastFail && Date.now() - Number(lastFail) < 30000) {
      setErrors({ submit: "Thử quá nhiều lần. Đợi 30 giây rồi thử lại." });
      return;
    }

    if (!validate()) return;

    try {
      setLoading(true);
      setErrors({});
      await setPersistence(auth, remember? browserLocalPersistence : browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, form.email, form.password);

      failedAttempts.current = 0;
      localStorage.removeItem("login_fail_time");
      localStorage.setItem("last_email", form.email);
      await establishSession(await cred.user.getIdToken());
      toast.success("Đăng nhập thành công");
      window.location.href = redirectTo;
    } catch (err: any) {
      failedAttempts.current += 1;
      localStorage.setItem("login_fail_time", Date.now().toString());
      const errorMap: Record<string, string> = {
        "auth/invalid-credential": "Email hoặc mật khẩu không đúng",
        "auth/user-not-found": "Tài khoản không tồn tại",
        "auth/wrong-password": "Mật khẩu không đúng",
        "auth/too-many-requests": "Thử quá nhiều lần",
        "auth/network-request-failed": "Lỗi mạng",
      };
      setErrors({ submit: errorMap[err.code] || "Đăng nhập thất bại" });
    } finally {
      setLoading(false);
    }
  };

  // FIX 6: Bỏ check user trong loading. Middleware đã chặn rồi.
  if (!mounted || authLoading) {
    return (
      <div className="min-h-dvh bg-zinc-50 px-5 py-8 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-300 motion-safe:animate-pulse dark:bg-zinc-700" />
        </div>
      </div>
    );
  }

  const isValid = form.email && form.password &&!errors.email &&!errors.password;

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10">
          <HuhaLogo />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" tabIndex={-1} autoComplete="off" className="hidden" value={form.honeypot} onChange={(e) => setField("honeypot", e.target.value)} />

          {errors.submit && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {errors.submit}
            </motion.div>
          )}

          {magicLinkSent && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
              Link đăng nhập đã được gửi. Kiểm tra hộp thư và thư mục Spam.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Email</label>
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                ref={emailRef}
                type="email"
                autoComplete="email"
                placeholder="Email của bạn"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className={`h-14 w-full rounded-2xl border bg-zinc-50 pl-12 pr-4 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${errors.email? "border-red-400 focus:border-red-500" : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"}`}
              />
            </div>
            {errors.email && <span className="text-xs font-semibold text-red-500">{errors.email}</span>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Mật khẩu</label>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                type={showPassword? "text" : "password"}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                className={`h-14 w-full rounded-2xl border bg-zinc-50 pl-12 pr-12 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${errors.password? "border-red-400 focus:border-red-500" : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"}`}
              />
              <button type="button" aria-label={showPassword? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((v) =>!v)} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-400 active:scale-95">
                {showPassword? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <span className="text-xs font-semibold text-red-500">{errors.password}</span>}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 text-sm">
            <label className="inline-flex items-center gap-2 font-semibold text-zinc-600 dark:text-zinc-300">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-[#0A84FF] focus:ring-[#0A84FF]" />
              Ghi nhớ
            </label>
            <Link href="/forgot-password" className="font-bold text-[#0A84FF]">Quên mật khẩu?</Link>
          </div>

          <button type="submit" disabled={loading ||!isValid} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98] disabled:opacity-60">
            {loading? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
          <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          hoặc
          <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <div className="grid gap-3">
          <button type="button" onClick={handleGoogleLogin} disabled={googleLoading} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white text-base font-black text-zinc-800 shadow-sm transition active:scale-[0.98] disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            <FcGoogle className="h-5 w-5" />
            {googleLoading? "Đang mở Google..." : "Tiếp tục với Google"}
          </button>
          <button type="button" onClick={handleMagicLink} disabled={magicLoading} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white text-base font-black text-zinc-700 transition active:scale-[0.98] disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            <FiSend className="h-5 w-5" />
            {magicLoading? "Đang gửi link..." : "Gửi link đăng nhập"}
          </button>
        </div>

        <p className="mt-8 text-center text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-black text-[#0A84FF]">
            Tạo tài khoản
          </Link>
        </p>

        <InstallPrompt />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-zinc-50 px-5 py-8 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-300 motion-safe:animate-pulse dark:bg-zinc-700" />
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}