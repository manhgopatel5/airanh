"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification, reload, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { toast, Toaster } from "sonner";
import { FiCheckCircle, FiRefreshCw, FiLogOut, FiSend } from "react-icons/fi";
import LottiePlayer from "@/components/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";
import { motion } from "framer-motion";

const vibrate = (p: number | number[]) => {
  if (typeof navigator!== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

export default function VerifyEmailPage() {
  const auth = getFirebaseAuth();
  const router = useRouter();
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  // lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user?.emailVerified) router.replace("/");
  }, [user, router]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (!auth.currentUser || sending || cooldown > 0) return;
    try {
      setSending(true); vibrate(5);
      await sendEmailVerification(auth.currentUser);
      toast.success("Đã gửi email xác thực");
      setCooldown(60);
    } catch (err: any) {
      toast.error(err.code === "auth/too-many-requests"? "Gửi quá nhiều lần. Thử lại sau" : "Gửi email thất bại");
    } finally { setSending(false); }
  };

  const handleCheck = async () => {
    if (!auth.currentUser || checking) return;
    try {
      setChecking(true); vibrate(5);
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        toast.success("Xác thực thành công!");
        vibrate([10,20,10]);
        router.replace("/");
      } else toast.error("Email chưa được xác thực");
    } catch { toast.error("Kiểm tra thất bại"); }
    finally { setChecking(false); }
  };

  const handleLogout = async () => {
    try { setLoggingOut(true); await signOut(auth); toast.success("Đã đăng xuất"); router.replace("/login"); }
    catch { toast.error("Đăng xuất thất bại"); }
    finally { setLoggingOut(false); }
  };

  if (!user) return null;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="h-screen w-screen fixed inset-0 bg-gradient-to-br from-[#E8F1FF] via-[#F0F7FF] to-[#F8FBFF] dark:from-[#050508] dark:via-[#0A0A0F] dark:to-[#0F0F14]">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#0042B2]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#1A5FFF]/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="h-screen w-screen flex items-center justify-center px-5 font-sans relative z-10">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{type:"spring",damping:22}} className="w-full max-w-">
          <div className="text-center mb-8">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] rounded-3xl blur-2xl opacity-50 animate-pulse" />
              <div className="relative w-full h-full bg-gradient-to-br from-[#0042B2] via-[#0055DD] to-[#1A5FFF] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#0042B2]/40 ring-1 ring-white/20">
                <LottiePlayer animationData={celebrate} loop autoplay className="w-14 h-14" aria-label="Email" pauseWhenHidden={false} />
              </div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">Xác thực email</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium px-4">Chúng tôi đã gửi link xác thực tới</p>
            <p className="text-base font-bold mt-1.5 break-all px-4" style={{color:'#0042B2'}}>{user.email}</p>
          </div>

          <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-zinc-200/50 dark:border-zinc-800">
            <div className="space-y-3">
              <motion.button whileTap={{scale:0.98}} onClick={handleCheck} disabled={checking} className="relative w-full h-14 rounded-2xl text-white text-base font-bold shadow-xl disabled:opacity-60 flex items-center justify-center gap-2.5" style={{background:'linear-gradient(135deg,#00C853,#00E676)'}}>
                {checking? <FiRefreshCw className="animate-spin" size={20}/> : <FiCheckCircle size={20}/>}
                {checking? "Đang kiểm tra..." : "Tôi đã xác thực"}
              </motion.button>

              <motion.button whileTap={{scale:0.98}} onClick={handleResend} disabled={sending || cooldown>0} className="w-full h-14 rounded-2xl font-bold text-base bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-2 border-zinc-200 dark:border-zinc-800 hover:border-[#0042B2]/50 flex items-center justify-center gap-2.5 disabled:opacity-50">
                {sending? <><div className="w-5 h-5 border- border-zinc-400/30 border-t-[#0042B2] rounded-full animate-spin"/>Đang gửi...</> : cooldown>0? <><FiSend size={18}/>Gửi lại sau {cooldown}s</> : <><FiSend size={18}/>Gửi lại email</>}
              </motion.button>
            </div>

            <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-zinc-800"/></div><div className="relative flex justify-center text-xs"><span className="bg-white/80 dark:bg-zinc-950/80 px-3 text-zinc-400">hoặc</span></div></div>

            <button onClick={handleLogout} disabled={loggingOut} className="w-full h-12 rounded-2xl font-semibold text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center gap-2 disabled:opacity-50">
              <FiLogOut size={16}/>{loggingOut? "Đang đăng xuất..." : "Dùng tài khoản khác"}
            </button>
          </div>
          <p className="text-center mt-6 text-xs text-zinc-400">Không nhận được? Kiểm tra thư mục Spam</p>
        </motion.div>
      </div>
    </>
  );
}