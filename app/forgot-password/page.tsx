"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification, reload } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { toast, Toaster } from "sonner";
import { FiMail, FiCheckCircle, FiRefreshCw } from "react-icons/fi";

export default function VerifyEmailPage() {
  const auth = getFirebaseAuth();
  const router = useRouter();
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.emailVerified) {
      router.replace("/");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (!auth.currentUser || sending || cooldown > 0) return;
    try {
      setSending(true);
      await sendEmailVerification(auth.currentUser);
      toast.success("Đã gửi email xác thực");
      setCooldown(60);
    } catch (err: any) {
      const msg: Record<string, string> = {
        "auth/too-many-requests": "Gửi quá nhiều lần. Thử lại sau",
      };
      toast.error(msg[err.code] || "Gửi email thất bại");
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
        toast.success("Xác thực thành công!");
        router.replace("/");
      } else {
        toast.error("Email chưa được xác thực");
      }
    } catch {
      toast.error("Kiểm tra thất bại");
    } finally {
      setChecking(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-zinc-800 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiMail className="text-blue-500" size={32} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Xác thực email
          </h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
            Chúng tôi đã gửi link xác thực tới{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{user.email}</span>
          </p>

          <div className="space-y-3">
            <button
              onClick={handleCheck}
              disabled={checking}
              className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checking? (
                <FiRefreshCw className="animate-spin" />
              ) : (
                <FiCheckCircle />
              )}
              {checking? "Đang kiểm tra..." : "Tôi đã xác thực"}
            </button>

            <button
              onClick={handleResend}
              disabled={sending || cooldown > 0}
              className="w-full py-3 rounded-xl font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {sending
              ? "Đang gửi..."
                : cooldown > 0
              ? `Gửi lại sau ${cooldown}s`
                : "Gửi lại email"}
            </button>
          </div>

          <button
            onClick={() => router.push("/login")}
            className="text-sm text-gray-500 dark:text-zinc-400 mt-6 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Đăng xuất và đăng nhập tài khoản khác
          </button>
        </div>
      </div>
    </>
  );
}