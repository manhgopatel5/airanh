"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiCheck, FiEye, FiEyeOff, FiLock, FiMail, FiSend, FiUser } from "react-icons/fi";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  sendEmailVerification,
  sendSignInLinkToEmail,
  setPersistence,
  signInWithEmailLink,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { motion } from "framer-motion";
import { toast } from "sonner";
import HuhaLogo from "@/components/brand/HuhaLogo";
import InstallPrompt from "@/components/InstallPrompt";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { getSafeRedirect } from "@/components/auth/authRoutes";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordScore = (password: string) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

export default function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData, loading: authLoading } = useAuth();
  const redirectTo = getSafeRedirect(searchParams.get("redirect"));
  const nameRef = useRef<HTMLInputElement>(null);

  const [auth, setAuth] = useState<ReturnType<typeof getFirebaseAuth> | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", honeypot: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    const nextAuth = getFirebaseAuth();
    setAuth(nextAuth);
    const lastEmail = localStorage.getItem("last_email");
    if (lastEmail) setForm((prev) => ({...prev, email: lastEmail }));
    window.setTimeout(() => nameRef.current?.focus(), 120);
  }, []);

  useEffect(() => {
    if (!authLoading && user?.emailVerified && userData) {
      router.replace(redirectTo);
    }
  }, [authLoading, redirectTo, router, user, userData]);

  useEffect(() => {
    if (!auth) return;
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email = localStorage.getItem("emailForSignIn") || form.email;
      if (!email) {
        setErrors({ submit: "Nhập email rồi gửi lại link để xác nhận thiết bị này." });
        return;
      }
      signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
          localStorage.removeItem("emailForSignIn");
          localStorage.setItem("last_email", email);
          toast.success("Đăng nhập thành công");
          router.replace(redirectTo);
        })
      .catch(() => setErrors({ submit: "Link không hợp lệ hoặc đã hết hạn" }));
    }
  }, [auth, form.email, redirectTo, router]);

  const strength = passwordScore(form.password);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({...prev, [field]: value }));
    if (errors[field] || errors.submit) setErrors((prev) => ({...prev, [field]: "", submit: "" }));
  };

  const validateField = useCallback((field: keyof typeof form, value: string) => {
    if (field === "name") {
      if (!value.trim()) return "Vui lòng nhập tên";
      if (value.trim().length < 2) return "Tên quá ngắn";
    }
    if (field === "email") {
      if (!value) return "Vui lòng nhập email";
      if (!emailRegex.test(value)) return "Email không hợp lệ";
    }
    if (field === "password") {
      if (!value) return "Vui lòng nhập mật khẩu";
      if (value.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
      if (passwordScore(value) < 3) return "Cần chữ hoa, thường, số và ký tự đặc biệt";
    }
    if (field === "confirmPassword" && value!== form.password) return "Mật khẩu không khớp";
    return "";
  }, [form.password]);

  const validate = useCallback(() => {
    const next: Record<string, string> = {};
    (["name", "email", "password", "confirmPassword"] as const).forEach((key) => {
      const message = validateField(key, form[key]);
      if (message) next[key] = message;
    });
    if (!acceptTerms) next.terms = "Vui lòng đồng ý điều khoản";
    if (!acceptPrivacy) next.privacy = "Vui lòng đồng ý chính sách";
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [acceptPrivacy, acceptTerms, form, validateField]);

  const handleGoogleSignup = async () => {
    if (!auth) return;
    try {
      setGoogleLoading(true);
      setErrors({});
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.addScope("email");
      provider.addScope("profile");
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      toast.success("Đăng nhập thành công");
      router.replace(redirectTo);
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
      setErrors({ submit: err.code === "auth/popup-blocked"? "Popup bị chặn. Cho phép popup và thử lại." : "Đăng nhập Google thất bại" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!auth) return;
    if (!form.email ||!emailRegex.test(form.email)) {
      setErrors({ email: "Nhập email hợp lệ trước" });
      return;
    }
    try {
      setMagicLoading(true);
      setErrors({});
      await sendSignInLinkToEmail(auth, form.email, {
        url: `${window.location.origin}/register?redirect=${encodeURIComponent(redirectTo)}`,
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

  const handleRegister = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!auth || form.honeypot) return;

    const lastAttempt = localStorage.getItem("last_register_attempt");
    if (lastAttempt && Date.now() - Number(lastAttempt) < 60000) {
      setErrors({ submit: "Vui lòng chờ 1 phút trước khi thử lại" });
      return;
    }
    if (!validate()) return;

    try {
      setLoading(true);
      setErrors({});
      localStorage.setItem("last_register_attempt", Date.now().toString());
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(userCred.user, { displayName: form.name.trim() });
      await sendEmailVerification(userCred.user);
      localStorage.setItem("last_email", form.email);
      toast.success("Đăng ký thành công. Kiểm tra email để xác thực.");
      router.replace("/verify-email");
    } catch (err: any) {
      const errorMap: Record<string, string> = {
        "auth/email-already-in-use": "Email đã được sử dụng",
        "auth/invalid-email": "Email không hợp lệ",
        "auth/weak-password": "Mật khẩu quá yếu",
        "auth/network-request-failed": "Lỗi mạng",
      };
      setErrors({ submit: errorMap[err.code] || "Đăng ký thất bại" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10">
          <HuhaLogo />
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
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
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Tên</label>
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input 
                ref={nameRef} 
                type="text" 
                autoComplete="name" 
                placeholder="Tên hiển thị" 
                value={form.name} 
                onChange={(e) => setField("name", e.target.value)} 
                className={`h-14 w-full rounded-2xl border bg-zinc-50 pl-12 pr-4 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${errors.name? "border-red-400 focus:border-red-500" : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"}`} 
              />
            </div>
            {errors.name && <span className="text-xs font-semibold text-red-500">{errors.name}</span>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Email</label>
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input type="email" autoComplete="email" placeholder="Email của bạn" value={form.email} onChange={(e) => setField("email", e.target.value)} className={`h-14 w-full rounded-2xl border bg-zinc-50 pl-12 pr-4 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${errors.email? "border-red-400 focus:border-red-500" : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"}`} />
            </div>
            {errors.email && <span className="text-xs font-semibold text-red-500">{errors.email}</span>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Mật khẩu</label>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input type={showPass? "text" : "password"} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" value={form.password} onChange={(e) => setField("password", e.target.value)} className={`h-14 w-full rounded-2xl border bg-zinc-50 pl-12 pr-12 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${errors.password? "border-red-400 focus:border-red-500" : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"}`} />
              <button type="button" aria-label={showPass? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPass((v) =>!v)} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-400 active:scale-95">{showPass? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}</button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[0, 1, 2, 3].map((item) => <span key={item} className={`h-1.5 rounded-full ${item < strength? "bg-[#0A84FF]" : "bg-zinc-200 dark:bg-zinc-800"}`} />)}
            </div>
            {errors.password && <span className="text-xs font-semibold text-red-500">{errors.password}</span>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Nhập lại mật khẩu</label>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input type={showConfirm? "text" : "password"} autoComplete="new-password" placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChange={(e) => setField("confirmPassword", e.target.value)} className={`h-14 w-full rounded-2xl border bg-zinc-50 pl-12 pr-12 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${errors.confirmPassword? "border-red-400 focus:border-red-500" : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"}`} />
              <button type="button" aria-label={showConfirm? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowConfirm((v) =>!v)} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-400 active:scale-95">{showConfirm? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}</button>
            </div>
            {errors.confirmPassword && <span className="text-xs font-semibold text-red-500">{errors.confirmPassword}</span>}
          </div>

          <div className="space-y-2 rounded-2xl bg-zinc-50 p-3 text-sm dark:bg-zinc-900/70">
            <label className="flex items-start gap-2 font-semibold text-zinc-600 dark:text-zinc-300">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#0A84FF] focus:ring-[#0A84FF]" />
              <span>Đồng ý <Link href="/terms" className="text-[#0A84FF]">Điều khoản</Link></span>
            </label>
            <label className="flex items-start gap-2 font-semibold text-zinc-600 dark:text-zinc-300">
              <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#0A84FF] focus:ring-[#0A84FF]" />
              <span>Đồng ý <Link href="/privacy" className="text-[#0A84FF]">Chính sách bảo mật</Link></span>
            </label>
            {(errors.terms || errors.privacy) && <p className="text-xs font-semibold text-red-500">{errors.terms || errors.privacy}</p>}
          </div>

          <button type="submit" disabled={loading} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98] disabled:opacity-60">
            {loading? "Đang tạo tài khoản..." : <><FiCheck className="h-5 w-5" /> Tạo tài khoản</>}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
          <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          hoặc
          <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <div className="grid gap-3">
          <button type="button" onClick={handleGoogleSignup} disabled={googleLoading} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white text-base font-black text-zinc-800 shadow-sm transition active:scale-[0.98] disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            <FcGoogle className="h-5 w-5" />
            {googleLoading? "Đang mở Google..." : "Tiếp tục với Google"}
          </button>
          <button type="button" onClick={handleMagicLink} disabled={magicLoading} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white text-base font-black text-zinc-700 transition active:scale-[0.98] disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            <FiSend className="h-5 w-5" />
            {magicLoading? "Đang gửi link..." : "Gửi link đăng nhập"}
          </button>
        </div>

        <p className="mt-8 text-center text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-black text-[#0A84FF]">
            Đăng nhập
          </Link>
        </p>

        <InstallPrompt />
      </div>
    </div>
  );
}