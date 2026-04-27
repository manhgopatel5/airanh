"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { toast, Toaster } from "sonner";
import { FiMail, FiArrowLeft, FiAlertCircle, FiSend } from "react-icons/fi";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const auth = getFirebaseAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleReset = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!email) {
      setError("Vui lòng nhập email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email không hợp lệ");
      return;
    }

    if (cooldown > 0) return;

    try {
      setLoading(true);
      setError("");

      await sendPasswordResetEmail(auth, email, {
        url: "https://airanh.vercel.app/login",
      });

      setSent(true);
      setCooldown(60);
      toast.success("Đã gửi link đặt lại mật khẩu");
    } catch (err: any) {
      const errorMap: Record<string, string> = {
        "auth/user-not-found": "Email chưa đăng ký tài khoản",
        "auth/invalid-email": "Email không hợp lệ",
        "auth/too-many-requests": "Gửi quá nhiều lần, thử lại sau",
        "auth/network-request-failed": "Lỗi mạng, kiểm tra kết nối",
      };
      setError(errorMap[err.code] || "Gửi email thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />

      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={() => router.back()}
              className="mb-6 w-10 h-10 bg-white dark:bg-zinc-900 rounded-lg flex items-center justify-center border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 active:scale-95 transition-all"
            >
              <FiArrowLeft className="text-gray-700 dark:text-zinc-300" size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-900 dark:bg-gray-100 rounded-2xl flex items-center justify-center">
                <FiMail className="text-white dark:text-gray-900" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1.5">
                Quên mật khẩu?
              </h1>
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                {sent
               ? "Kiểm tra email để đặt lại mật khẩu"
                  : "Nhập email để nhận link đặt lại mật khẩu"}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-3 py-2.5 rounded-lg mb-4 flex items-center gap-2 text-sm">
                <FiAlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {sent && (
              <div className="bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 rounded-lg mb-4 flex items-center gap-2 text-sm">
                <FiSend size={16} className="flex-shrink-0" />
                Đã gửi! Kiểm tra hộp thư và thư mục Spam
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    placeholder="Email của bạn"
                    autoComplete="email"
                    className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm ${
                      error? "border-red-500" : "border-gray-300 dark:border-zinc-700"
                    } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none transition-all`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    disabled={sent && cooldown > 0}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={loading || (sent && cooldown > 0)}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm bg-gray-900 dark:bg-gray-100 dark:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang gửi...
                  </>
                ) : cooldown > 0? (
                  <>
                    <FiSend size={18} />
                    Gửi lại sau {cooldown}s
                  </>
                ) : (
                  <>
                    <FiSend size={18} />
                    Gửi link đặt lại
                  </>
                )}
              </motion.button>
            </form>

            <p className="text-center text-sm text-gray-600 dark:text-zinc-400 mt-4">
              Nhớ mật khẩu?{" "}
              <Link href="/login" className="font-semibold text-gray-900 dark:text-gray-100 hover:underline">
                Đăng nhập ngay
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}