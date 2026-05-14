"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { updateEmail, sendEmailVerification, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { ChevronLeft, Mail, Lock, AtSign } from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";

import celebrate from "@/public/lotties/huha-celebrate.json";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

export default function ChangeEmailPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = async () => {
    if (!user?.email) return toast.error("Tài khoản không có email");
    if (!newEmail ||!password) return toast.error("Nhập đủ thông tin");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return toast.error("Email không hợp lệ");

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, newEmail);
      await sendEmailVerification(user);
      await updateDoc(doc(db, "users", user.uid), { email: newEmail, emailVerified: false });
      setShowSuccess(true);
      navigator.vibrate?.([10, 20, 10]);
      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 1800);
    } catch (err: any) {
      if (err.code === "auth/wrong-password") toast.error("Mật khẩu sai");
      else if (err.code === "auth/email-already-in-use") toast.error("Email đã được dùng");
      else if (err.code === "auth/invalid-email") toast.error("Email không hợp lệ");
      else if (err.code === "auth/requires-recent-login") toast.error("Vui lòng đăng nhập lại");
      else toast.error("Thất bại");
    } finally { setLoading(false); }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-28">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center shadow-lg shadow-[#0042B2]/20">
                <AtSign className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-black tracking-tight">Đổi email</h1>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-950 rounded-3xl border-zinc-200/60 dark:border-zinc-900 p-6 shadow-sm space-y-5">
            <div className="bg-[#E8F1FF] dark:bg-[#0042B2]/10 border-[#0042B2]/20 rounded-2xl p-4">
              <p className="text-sm text-[#0042B2] dark:text-[#8AB4F8]">Email hiện tại: <strong>{user?.email || "N/A"}</strong></p>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Email mới</label>
              <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-[#0042B2]/30 focus-within:border-[#0042B2] transition-all">
                <Mail className="w-5 h-5 text-zinc-400" />
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nhap@email.moi" className="flex-1 bg-transparent outline-none" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Mật khẩu hiện tại</label>
              <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-[#0042B2]/30 focus-within:border-[#0042B2] transition-all">
                <Lock className="w-5 h-5 text-zinc-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập để xác nhận" className="flex-1 bg-transparent outline-none" onKeyDown={(e) => e.key === "Enter" && handleChange()} />
              </div>
            </div>

            <motion.button whileTap={{ scale: 0.98 }} onClick={handleChange} disabled={loading ||!newEmail ||!password} className="w-full h-12 rounded-2xl bg-[#0042B2] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0042B2]/25">
              {loading? <LottiePlayer animationData={loadingPull} loop autoplay className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
              {loading? "Đang xử lý..." : "Đổi email"}
            </motion.button>

            <p className="text-xs text-center text-zinc-500">Bạn cần xác thực email mới trước khi sử dụng</p>
          </motion.div>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <div className="bg-white dark:bg-zinc-950 rounded-3xl p-8 shadow-2xl">
                <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-24 h-24 mx-auto" />
                <p className="text-center font-bold mt-3">Đã gửi link xác thực!</p>
                <p className="text-center text-sm text-zinc-500 mt-1">Kiểm tra email mới</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}