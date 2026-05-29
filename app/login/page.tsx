"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiEye, FiEyeOff, FiLock, FiMail, FiSend } from "react-icons/fi";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  sendEmailVerification,
  sendSignInLinkToEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  type Auth,
} from "firebase/auth";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AuthShell from "@/components/auth/AuthShell";
import { getSafeRedirect } from "@/components/auth/authRoutes";
import InstallPrompt from "@/components/InstallPrompt";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData, loading: authLoading } = useAuth();
  const authRef = useRef<Auth | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const redirectTo = getSafeRedirect(searchParams.get("redirect"));

  const [form, setForm] = useState({ email: "", password: "", honeypot: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const failedAttempts = useRef(0);

  useEffect(() => {
    if (!authLoading && user?.emailVerified && userData) {
      router.replace(redirectTo);
    }
  }, [authLoading, redirectTo, router, user, userData]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    authRef.current = auth;

    const lastEmail = localStorage.getItem("last_email");
    if (lastEmail) setForm((prev) => ({ ...prev, email: lastEmail }));

    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email = localStorage.getItem("emailForSignIn") || lastEmail;
      if (!email) {
        setErrors({ submit: "Nhập email rồi gửi lại link đăng nhập để xác nhận thiết bị này." });
      } else {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            localStorage.removeItem("emailForSignIn");
            localStorage.setItem("last_email", email);
            toast.success("Đăng nhập thành công");
            router.replace(redirectTo);
          })
          .catch(() => setErrors({ submit: "Link đăng nhập không hợp lệ hoặc đã hết hạn" }));
      }
    }

    window.setTimeout(() => emailRef.current?.focus(), 120);
  }, [redirectTo, router]);

  const setField = (field: "email" | "password" | "honeypot", value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field] || errors.submit) {
      setErrors((prev) => ({ ...prev, [field]: "", submit: "" }));
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
    if (!form.email || !emailRegex.test(form.email)) {
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
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      localStorage.setItem("last_email", auth.currentUser?.email || "");
      toast.success("Đăng nhập thành công");
      router.replace(redirectTo);
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
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const res = await signInWithEmailAndPassword(auth, form.email, form.password);

      if (!res.user.emailVerified) {
        await sendEmailVerification(res.user).catch(() => {});
        toast.warning("Vui lòng xác thực email trước");
        router.replace("/verify-email");
        return;
      }

      failedAttempts.current = 0;
      localStorage.removeItem("login_fail_time");
      localStorage.setItem("last_email", form.email);
      toast.success("Đăng nhập thành công");
      router.replace(redirectTo);
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

  if (authLoading) {
    return (
      <AuthShell title="Đang chuẩn bị AIR" description="Kiểm tra phiên đăng nhập và đồng bộ hồ sơ của bạn.">
        <div className="space-y-3" role="status" aria-label="Đang tải">
          <div className="h-12 rounded-2xl bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-12 rounded-2xl bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-12 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-700" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Đăng nhập"
      description="Vào AIR để nhận task, lưu cơ hội và quản lý việc của bạn nhanh hơn."
      footer={
        <>
          Chưa có tài khoản? <Link href="/register" className="font-bold text-sky-600 dark:text-sky-300">Tạo tài khoản</Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <input type="text" tabIndex={-1} autoComplete="off" className="hidden" value={form.honeypot} onChange={(e) => setField("honeypot", e.target.value)} />

        {errors.submit && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {errors.submit}
          </motion.div>
        )}

        {magicLinkSent && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
            Link đăng nhập đã được gửi. Kiểm tra hộp thư và thư mục Spam.
          </div>
        )}

        <label className="block space-y-2">
          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Email</span>
          <span className="relative block">
            <FiMail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              ref={emailRef}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              className={`h-12 w-full rounded-2xl border bg-white pl-11 pr-4 text-base font-semibold text-zinc-900 outline-none transition focus:ring-4 dark:bg-zinc-900 dark:text-white ${errors.email ? "border-red-400 focus:ring-red-500/10" : "border-zinc-200 focus:border-sky-500 focus:ring-sky-500/10 dark:border-zinc-700"}`}
            />
          </span>
          {errors.email && <span className="text-xs font-semibold text-red-500">{errors.email}</span>}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Mật khẩu</span>
          <span className="relative block">
            <FiLock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              className={`h-12 w-full rounded-2xl border bg-white pl-11 pr-12 text-base font-semibold text-zinc-900 outline-none transition focus:ring-4 dark:bg-zinc-900 dark:text-white ${errors.password ? "border-red-400 focus:ring-red-500/10" : "border-zinc-200 focus:border-sky-500 focus:ring-sky-500/10 dark:border-zinc-700"}`}
            />
            <button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-400 active:scale-95">
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </span>
          {errors.password && <span className="text-xs font-semibold text-red-500">{errors.password}</span>}
        </label>

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="inline-flex items-center gap-2 font-semibold text-zinc-600 dark:text-zinc-300">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500" />
            Ghi nhớ
          </label>
          <Link href="/forgot-password" className="font-bold text-sky-600 dark:text-sky-300">Quên mật khẩu?</Link>
        </div>

        <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-sm font-black text-white shadow-xl shadow-sky-500/25 transition active:scale-[0.98] disabled:opacity-60">
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        hoặc
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="grid gap-3">
        <button type="button" onClick={handleGoogleLogin} disabled={googleLoading} className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white text-sm font-black text-zinc-800 shadow-sm transition active:scale-[0.98] disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          <FcGoogle className="h-5 w-5" />
          {googleLoading ? "Đang mở Google..." : "Tiếp tục với Google"}
        </button>
        <button type="button" onClick={handleMagicLink} disabled={magicLoading} className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-zinc-100 text-sm font-black text-zinc-700 transition active:scale-[0.98] disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-200">
          <FiSend className="h-4 w-4" />
          {magicLoading ? "Đang gửi link..." : "Gửi link đăng nhập"}
        </button>
      </div>

      <InstallPrompt />
    </AuthShell>
  );
}
