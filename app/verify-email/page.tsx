"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification, reload, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { toast, Toaster } from "sonner";
import { FiCheckCircle, FiRefreshCw, FiLogOut, FiSend } from "react-icons/fi";
import LottiePlayer from "@/components/ui/LottiePlayer";
import celebrate from "@/assets/lotties/huha-celebrate.json";
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
        vibrate([10, 20, 10]);
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
      <div className="h-screen w-screen fixed inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="h-screen w-screen flex items-center justify-center px-5 font-sans relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 22 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-3xl blur-2xl opacity-50 animate-pulse" />
              <div className="relative w-full h-full bg-gradient-to-br from-primary to-accent rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/40 ring-1 ring-white/20">
                <LottiePlayer animationData={celebrate} loop autoplay className="w-14 h-14" aria-label="Email" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">Xác thực email</h1>
            <p className="text-sm text-muted-foreground font-medium px-4">Chúng tôi đã gửi link xác thực tới</p>
            <p className="text-base font-bold mt-1.5 break-all px-4 text-primary">{user.email}</p>
          </div>

          <div className="glass rounded-3xl p-6 shadow-2xl border border-border">
            <div className="space-y-3">
              <motion.button 
                whileTap={{ scale: 0.98 }} 
                onClick={handleCheck} 
                disabled={checking} 
                aria-busy={checking}
                className="relative w-full h-14 rounded-2xl text-primary-foreground text-base font-bold shadow-xl disabled:opacity-60 flex items-center justify-center gap-2.5 bg-gradient-to-r from-accent to-accent/80"
              >
                {checking? <FiRefreshCw className="animate-spin" size={20} /> : <FiCheckCircle size={20} />}
                {checking? "Đang kiểm tra..." : "Tôi đã xác thực"}
              </motion.button>

              <motion.button 
                whileTap={{ scale: 0.98 }} 
                onClick={handleResend} 
                disabled={sending || cooldown > 0} 
                aria-busy={sending}
                className="w-full h-14 rounded-2xl font-bold text-base bg-secondary text-secondary-foreground border-2 border-border hover:border-primary/50 flex items-center justify-center gap-2.5 disabled:opacity-50 transition-colors"
              >
                {sending? <><div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />Đang gửi...</> : cooldown > 0? <><FiSend size={18} />Gửi lại sau {cooldown}s</> : <><FiSend size={18} />Gửi lại email</>}
              </motion.button>
            </div>

            <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">hoặc</span></div></div>

            <button 
              onClick={handleLogout} 
              disabled={loggingOut} 
              aria-busy={loggingOut}
              className="w-full h-12 rounded-2xl font-semibold text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              <FiLogOut size={16} />{loggingOut? "Đang đăng xuất..." : "Dùng tài khoản khác"}
            </button>
          </div>
          <p className="text-center mt-6 text-xs text-muted-foreground">Không nhận được? Kiểm tra thư mục Spam</p>
        </motion.div>
      </div>
    </>
  );
}