"use client";

import { useEffect, useState } from "react";
import { reload, sendEmailVerification, signOut } from "firebase/auth";
import { FiCheckCircle, FiLogOut, FiMail, FiRefreshCw, FiSend } from "react-icons/fi";
import { toast } from "sonner";
import AuthShell from "@/components/auth/AuthShell";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

export default function VerifyEmailPage() {
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
      await sendEmailVerification(auth.currentUser);
      toast.success("Đã gửi email xác thực");
      setCooldown(60);
    } catch (err: any) {
      toast.error(err.code === "auth/too-many-requests"? "Gửi quá nhiều lần. Thử lại sau" : "Gửi email thất bại");
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
      toast.success("Đã đăng xuất");
    } catch {
      toast.error("Đăng xuất thất bại");
    } finally {
      setLoggingOut(false);
    }
  };

  if (!mounted || loading) {
    return (
      <AuthShell title="Đang kiểm tra email" description="AIR đang xác nhận trạng thái tài khoản của bạn." icon={<FiMail className="h-6 w-6" />}>
        <div className="space-y-3" role="status" aria-label="Đang tải">
          <div className="h-12 rounded-2xl bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-12 rounded-2xl bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-800" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Xác thực email"
      description="Chúng tôi đã gửi link xác thực tới email của bạn. Xác thực xong rồi quay lại bấm kiểm tra."
      icon={<FiMail className="h-6 w-6" />}
      footer="Không thấy email? Kiểm tra thư mục Spam hoặc gửi lại sau ít giây."
    >
      <div className="mb-5 rounded-2xl bg-zinc-50 px-4 py-3 text-center ring-1 ring-black/5 dark:bg-zinc-900/70 dark:ring-white/10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Email tài khoản</p>
        <p className="mt-1 break-all text-sm font-black text-sky-600 dark:text-sky-300">{user?.email}</p>
      </div>

      <div className="space-y-3">
        <button onClick={handleCheck} disabled={checking} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-sm font-black text-white shadow-xl shadow-sky-500/25 transition active:scale-[0.98] disabled:opacity-60">
          {checking? <FiRefreshCw className="h-4 w-4 motion-safe:animate-spin" /> : <FiCheckCircle className="h-4 w-4" />}
          {checking? "Đang kiểm tra..." : "Tôi đã xác thực"}
        </button>

        <button onClick={handleResend} disabled={sending || cooldown > 0} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-100 text-sm font-black text-zinc-700 transition active:scale-[0.98] disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200">
          {sending? <FiRefreshCw className="h-4 w-4 motion-safe:animate-spin" /> : <FiSend className="h-4 w-4" />}
          {sending? "Đang gửi..." : cooldown > 0? `Gửi lại sau ${cooldown}s` : "Gửi lại email"}
        </button>

        <button onClick={handleLogout} disabled={loggingOut} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-zinc-500 transition active:scale-[0.98] hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-300">
          <FiLogOut className="h-4 w-4" />
          {loggingOut? "Đang đăng xuất..." : "Đăng xuất và dùng tài khoản khác"}
        </button>
      </div>
    </AuthShell>
  );
}