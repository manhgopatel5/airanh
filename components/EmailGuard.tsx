"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { toast } from "sonner";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion } from "framer-motion";

export default function EmailGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const publicRoutes = ["/login", "/register", "/forgot-password", "/terms", "/privacy", "/verify-email"];

  // ✅ LOTTIE
  const loadingLottie = "/lotties/huha-loading-pull-full.lottie";
  const mailLottie = "/lotties/huha-celebrate-full.lottie";

  useEffect(() => {
    if (!loading && !user && !publicRoutes.includes(pathname)) {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  useEffect(() => {
    if (!loading && user && !user.emailVerified && !publicRoutes.includes(pathname)) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [user, loading, pathname]);

  const resendEmail = async () => {
    if (!user || sending) return;
    setSending(true);
    try {
      await sendEmailVerification(user);
      toast.success("Đã gửi lại email xác minh");
      navigator.vibrate?.([10,20,10]);
    } catch (e: any) {
      toast.error(e.message || "Gửi email thất bại");
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    const { getFirebaseAuth } = await import("@/lib/firebase");
    await getFirebaseAuth().signOut();
    router.push("/login");
  };

  // FIX 1: Đang loading thì hiện màn hình trắng có logo, không render children
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <DotLottieReact src={loadingLottie} autoplay loop style={{width:80,height:80}} />
          <img src="/logo.png" alt="AIR" className="w-12 h-12 opacity-60" />
        </div>
      </div>
    );
  }

  // FIX 2: Trang public thì cho qua luôn
  if (publicRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  // FIX 3: Chưa login mà vào trang private → hiện logo chờ redirect, không render children
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex items-center justify-center">
        <DotLottieReact src={loadingLottie} autoplay loop style={{width:80,height:80}} />
      </div>
    );
  }

  return (
    <>
      {children}

      {showModal && user && !user.emailVerified && (
        <div className="fixed inset-0 z-50 backdrop-blur-2xl bg-black/70 flex items-center justify-center p-6">
          <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",damping:24,stiffness:300}} className="w-full max-w-sm bg-white dark:bg-zinc-950 rounded-3xl p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800">
            <div className="w-20 h-20 mx-auto mb-5 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] rounded-3xl blur-2xl opacity-30" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] rounded-3xl flex items-center justify-center shadow-xl">
                <DotLottieReact src={mailLottie} autoplay loop style={{width:48,height:48}} />
              </div>
            </div>

            <h2 className="text-2xl font-black text-center text-zinc-900 dark:text-white mb-2 tracking-tight">
              Xác minh email
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-2">
              Vui lòng xác minh để tiếp tục
            </p>
            <p className="text-sm font-bold text-[#0042B2] dark:text-[#5B8DEF] text-center mb-6 break-all">
              {user.email}
            </p>

            <button
              onClick={resendEmail}
              disabled={sending}
              className="w-full h-14 text-white font-bold text-base rounded-2xl active:scale-[0.97] transition-all disabled:opacity-60 flex items-center justify-center gap-2 mb-3 shadow-lg"
              style={{background:'linear-gradient(135deg,#0042B2,#0066FF)',boxShadow:'0 12px 28px -8px rgba(0,66,178,0.45)'}}
            >
              {sending ? (
                <>
                  <div className="w-5 h-5"><DotLottieReact src={loadingLottie} autoplay loop style={{width:20,height:20}} /></div>
                  Đang gửi...
                </>
              ) : (
                "Gửi lại email xác minh"
              )}
            </button>

            <button
              onClick={handleLogout}
              className="w-full h-12 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold rounded-2xl active:scale-[0.97] transition-all hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              Đăng xuất
            </button>

            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center mt-6">
              Kiểm tra cả thư mục Spam
            </p>
          </motion.div>
        </div>
      )}
    </>
  );
}
