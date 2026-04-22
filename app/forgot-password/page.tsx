"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast, Toaster } from "sonner";
import { FiMail, FiArrowLeft, FiCheckCircle } from "react-icons/fi";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email: string) => {
    if (!email) return "Vui lòng nhập email";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email không hợp lệ";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    // Rate limit: 60s
    const lastAttempt = localStorage.getItem("last_reset_attempt");
    if (lastAttempt && Date.now() - parseInt(lastAttempt) < 60000) {
      setError("Vui lòng chờ 1 phút trước khi thử lại");
      return;
    }

    try {
      setLoading(true);
      setError("");
      localStorage.setItem("last_reset_attempt", Date.now().toString());
      
      await sendPasswordResetEmail(auth, email);
      setSent(true);
      toast.success("Đã gửi email đặt lại mật khẩu");
    } catch (err: any) {
      const errorMap: Record<string, string> = {
        "auth/user-not-found": "Email không tồn tại trong hệ thống",
        "auth/invalid-email": "Email không hợp lệ",
        "auth/too-many-requests": "Thử quá nhiều lần, vui lòng thử lại sau",
        "auth/network-request-failed": "Lỗi mạng, kiểm tra kết nối",
      };
      setError(errorMap[err.code] || "Gửi thất bại, thử lại sau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-gray-600 dark:text-zinc-400 mb-6 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <FiArrowLeft size={20} />
            <span className="text-sm font-semibold">Quay lại đăng nhập</span>
          </Link>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-zinc-800">
            {sent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheckCircle className="text-green-500" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Kiểm tra email
                </h1>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
                  Chúng tôi đã gửi link đặt lại mật khẩu tới{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{email}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mb-6">
                  Không nhận được email? Kiểm tra thư mục spam hoặc{" "}
                  <button
                    onClick={() => setSent(false)}
                    className="text-blue-500 font-semibold"
                  >
                    thử lại
                  </button>
                </p>
                <button
                  onClick={() => router.push("/login")}
                  className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                  Về trang đăng nhập
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <FiMail className="text-blue-500" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Quên mật khẩu?
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-zinc-400">
                    Nhập email để nhận link đặt lại mật khẩu
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl mb-4 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center bg-gray-50 dark:bg-zinc-800 rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                      <FiMail className="mr-3 text-gray-400 dark:text-zinc-500" size={20} />
                      <input
                        type="email"
                        placeholder="Email đã đăng ký"
                        autoComplete="email"
                        className="w-full outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError("");
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Đang gửi..." : "Gửi email đặt lại"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
