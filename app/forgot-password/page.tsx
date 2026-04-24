"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { toast, Toaster } from "sonner";
import { FiMail, FiArrowLeft, FiAlertCircle, FiSend } from "react-icons/fi";

export default function ForgotPasswordPage() {
  const auth = getFirebaseAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  /* ================= KHÓA SCROLL ================= */
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const originalHeight = document.body.style.height;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";

    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("touchmove", preventDefault, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overflow = "";
      document.removeEventListener("touchmove", preventDefault);
    };
  }, []);

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
        url: "https://airanh.vercel.app/login", // Redirect về login sau khi reset
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

      {/* BACKGROUND */}
      <div className="h-screen w-screen fixed inset-0 bg-gradient-to-br from-[#E8F1FF] via-[#F0F7FF] to-[#F8FBFF] dark:from-[#0A0A0F] dark:via-[#0F0F1A] dark:to-[#14141F]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-40" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
      </div>

      <div className="h-screen w-screen flex items-center justify-center px-5 font-sans relative z-10">
        <div className="w-full max-w-[400px]">
          {/* BACK BUTTON */}
          <button
            onClick={() => router.back()}
            className="mb-8 w-12 h-12 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl flex items-center justify-center shadow-xl shadow-gray-900/5 dark:shadow-black/30 border-2 border-white/60 dark:border-zinc-800/60 hover:scale-105 active:scale-95 transition-all"
          >
            <FiArrowLeft className="text-gray-700 dark:text-zinc-300" size={22} />
          </button>

          {/* ICON */}
          <div className="text-center mb-8">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl blur-2xl opacity-50" />
              <div className="relative w-full h-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 ring-1 ring-white/30">
                <FiMail className="text-white" size={48} strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              Quên mật khẩu?
            </h1>
            <p className="text-base text-gray-500 dark:text-zinc-400 font-medium px-4">
              {sent
               ? "Kiểm tra email để đặt lại mật khẩu"
                : "Nhập email để nhận link đặt lại mật khẩu"}
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-red-500/10 dark:bg-red-500/20 backdrop-blur-xl border border-red-500/20 dark:border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3.5 rounded-2xl mb-5 flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
              <FiAlertCircle size={20} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* SUCCESS */}
          {sent && (
            <div className="bg-emerald-500/10 dark:bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-4 py-3.5 rounded-2xl mb-5 flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
              <FiSend size={20} className="flex-shrink-0" />
              Đã gửi! Kiểm tra hộp thư và thư mục Spam
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            {/* EMAIL */}
            <div className={`group relative flex items-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl px-4 h-14 shadow-xl shadow-gray-900/5 dark:shadow-black/30 border-2 transition-all duration-300 ${error? 'border-red-400 dark:border-red-500' : 'border-white/60 dark:border-zinc-800/60 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:shadow-blue-500/20'}`}>
              <FiMail className={`mr-3.5 flex-shrink-0 transition-colors ${error? 'text-red-500' : 'text-gray-400 dark:text-zinc-500 group-focus-within:text-blue-500'}`} size={22} />
              <input
                type="email"
                placeholder="Email của bạn"
                autoComplete="email"
                className="w-full outline-none bg-transparent text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 font-medium border-none focus:ring-0"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                disabled={sent && cooldown > 0}
              />
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading || (sent && cooldown > 0)}
              className="relative w-full h-14 rounded-2xl text-white text-base font-bold bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mt-7 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center gap-2.5">
                {loading? (
                  <>
                    <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                    Đang gửi...
                  </>
                ) : cooldown > 0? (
                  <>
                    <FiSend size={20} />
                    Gửi lại sau {cooldown}s
                  </>
                ) : (
                  <>
                    <FiSend size={20} />
                    Gửi link đặt lại
                  </>
                )}
              </div>
            </button>
          </form>

          {/* BACK TO LOGIN */}
          <p className="text-center mt-8 text-base text-gray-600 dark:text-zinc-400 font-medium">
            Nhớ mật khẩu?{" "}
            <Link href="/login" className="text-blue-600 dark:text-blue-500 font-bold hover:text-blue-700 dark:hover:text-blue-400 active:opacity-70 transition-all">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}