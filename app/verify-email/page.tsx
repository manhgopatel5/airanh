"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification, reload, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { toast, Toaster } from "sonner";
import { FiMail, FiCheckCircle, FiRefreshCw, FiLogOut, FiSend } from "react-icons/fi";

export default function VerifyEmailPage() {
  const auth = getFirebaseAuth();
  const router = useRouter();
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

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
    let isMounted = true;

    if (!user && isMounted) {
      router.replace("/login");
      return;
    }
    if (user?.emailVerified && isMounted) {
      router.replace("/");
      return;
    }

    return () => {
      isMounted = false;
    };
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

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      toast.success("Đã đăng xuất");
      router.replace("/login");
    } catch (err) {
      toast.error("Đăng xuất thất bại");
    } finally {
      setLoggingOut(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Toaster richColors position="top-center" />

      {/* BACKGROUND */}
      <div className="h-screen w-screen fixed inset-0 bg-gradient-to-br from-[#E8F1FF] via-[#F0F7FF] to-[#F8FBFF] dark:from-[#0A0A0F] dark:via-[#0F0F1A] dark:to-[#14141F]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-40" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="h-screen w-screen flex items-center justify-center px-5 font-sans relative z-10">
        <div className="w-full max-w-[400px]">
          {/* ICON */}
          <div className="text-center mb-8">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded- blur-2xl opacity-50 animate-pulse" />
              <div className="relative w-full h-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded- flex items-center justify-center shadow-2xl shadow-blue-500/40 ring-1 ring-white/30">
                <FiMail className="text-white" size={48} strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="text- font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              Xác thực email
            </h1>
            <p className="text- text-gray-500 dark:text-zinc-400 font-medium px-4">
              Chúng tôi đã gửi link xác thực tới
            </p>
            <p className="text- font-bold text-blue-600 dark:text-blue-500 mt-1.5 break-all px-4">
              {user.email}
            </p>
          </div>

          {/* CARD */}
          <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded- p-6 shadow-2xl shadow-gray-900/10 dark:shadow-black/40 border border-white/60 dark:border-zinc-800/60">
            <div className="space-y-3">
              {/* CHECK BUTTON */}
              <button
                onClick={handleCheck}
                disabled={checking}
                className="relative w-full h- rounded-2xl text-white text- font-bold bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/40 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-2.5">
                  {checking? (
                    <FiRefreshCw className="animate-spin" size={20} />
                  ) : (
                    <FiCheckCircle size={20} />
                  )}
                  {checking? "Đang kiểm tra..." : "Tôi đã xác thực"}
                </div>
              </button>

              {/* RESEND BUTTON */}
              <button
                onClick={handleResend}
                disabled={sending || cooldown > 0}
                className="relative w-full h- rounded-2xl font-bold text- bg-gray-100/80 dark:bg-zinc-800/80 backdrop-blur-xl text-gray-700 dark:text-zinc-300 border-2 border-gray-200/60 dark:border-zinc-700/60 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
              >
                {sending? (
                  <>
                    <div className="w-5 h-5 border-[3px] border-gray-400/30 border-t-blue-500 rounded-full animate-spin" />
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
                    Gửi lại email
                  </>
                )}
              </button>
            </div>

            {/* DIVIDER */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-">
                <span className="bg-white/70 dark:bg-zinc-900/70 px-3 text-gray-400 dark:text-zinc-500 font-medium">
                  hoặc
                </span>
              </div>
            </div>

            {/* LOGOUT BUTTON */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full h- rounded-2xl font-bold text- text-gray-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            >
              <FiLogOut size={18} />
              {loggingOut? "Đang đăng xuất..." : "Đăng xuất & dùng tài khoản khác"}
            </button>
          </div>

          {/* TIP */}
          <p className="text-center mt-6 text- text-gray-400 dark:text-zinc-500 font-medium">
            Không nhận được? Kiểm tra thư mục Spam
          </p>
        </div>
      </div>
    </>
  );
}