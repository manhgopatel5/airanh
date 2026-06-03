"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { reload, signOut } from "firebase/auth";
import { FiCheckCircle, FiLogOut, FiMail, FiRefreshCw, FiSend } from "react-icons/fi";
import { toast } from "sonner";
import HuhaLogo from "@/components/brand/HuhaLogo";
import InstallPrompt from "@/components/InstallPrompt";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

export default function VerifyEmailPage() {
  const router = useRouter();
  const auth = getFirebaseAuth();
  const { user, loading } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!auth.currentUser || sending || cooldown > 0) return;
    try {
      setSending(true);
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/api/send-verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` }
      });

      if (!res.ok) throw new Error('Send failed');

      toast.success("Đã gửi email xác thực");
      setCooldown(60);
    } catch (err: any) {
      toast.error("Gửi email thất bại. Thử lại sau 1 phút");
    } finally {
      setSending(false);
    }
  };

  const handleCheck = async () => {
  if (!auth.currentUser || checking) return;
  try {
    setChecking(true);
    await reload(auth.currentUser);
    if (auth.currentUser.emailVerified) {
      toast.success("Xác thực thành công");
      router.replace("/onboarding"); // <-- Sửa ở đây
    } else {
      toast.error("Email chưa được xác thực");
    }
  } catch {
    toast.error("Kiểm tra thất bại");
  } finally {
    setChecking(false);
  }
};

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      localStorage.clear();
      toast.success("Đã đăng xuất");
      router.replace("/login");
    } catch {
      toast.error("Đăng xuất thất bại");
    } finally {
      setLoggingOut(false);
    }
  };

  if (!mounted || loading) {
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

  if (!user) {
    return (
      <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10"><HuhaLogo /></div>
          <div className="mb-6 text-center">
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Bạn chưa đăng nhập hoặc đã đăng xuất.
            </p>
          </div>
          <button
            onClick={() => router.replace("/login")}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98]"
          >
            Về trang đăng nhập
          </button>
          <InstallPrompt />
        </div>
      </div>
    );
  }

  if (user.emailVerified) {
    return (
      <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10"><HuhaLogo /></div>
          <div className="mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                <FiCheckCircle className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Đã xác thực</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Email {user.email} đã được xác thực thành công.
            </p>
          </div>
          <button
            onClick={() => router.replace("/")}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98]"
          >
            Vào trang chủ
          </button>
          <InstallPrompt />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10"><HuhaLogo /></div>

        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0A84FF]/10 text-[#0A84FF]">
              <FiMail className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Xác thực email</h1>
          </div>
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Chúng tôi đã gửi link xác thực tới email của bạn. Xác thực xong rồi quay lại bấm kiểm tra.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Email tài khoản</p>
            <p className="mt-1 break-all text-base font-black text-[#0A84FF]">{user.email}</p>
          </div>

          <button
            onClick={handleCheck}
            disabled={checking}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98] disabled:opacity-60"
          >
            {checking? <FiRefreshCw className="h-5 w-5 motion-safe:animate-spin" /> : <FiCheckCircle className="h-5 w-5" />}
            {checking? "Đang kiểm tra..." : "Tôi đã xác thực"}
          </button>

          <button
            onClick={handleResend}
            disabled={sending || cooldown > 0}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-base font-black text-zinc-700 transition active:scale-[0.98] disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {sending? <FiRefreshCw className="h-5 w-5 motion-safe:animate-spin" /> : <FiSend className="h-5 w-5" />}
            {sending? "Đang gửi..." : cooldown > 0? `Gửi lại sau ${cooldown}s` : "Gửi lại email"}
          </button>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-base font-black text-zinc-500 transition active:scale-[0.98] hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
          >
            <FiLogOut className="h-5 w-5" />
            {loggingOut? "Đang đăng xuất..." : "Đăng xuất và dùng tài khoản khác"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Không thấy email? Kiểm tra thư mục Spam hoặc Quảng cáo.
        </p>

        <InstallPrompt />
      </div>
    </div>
  );
}