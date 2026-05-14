"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { ChevronLeft, Lock, EyeOff, Eye, Shield, CheckCircle2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";

import celebrate from "@/public/lotties/huha-celebrate.json";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const strength = () => {
    if (!newPass) return 0;
    let s = 0;
    if (newPass.length >= 6) s++;
    if (newPass.length >= 8) s++;
    if (/[A-Z]/.test(newPass)) s++;
    if (/[0-9]/.test(newPass)) s++;
    if (/[^A-Za-z0-9]/.test(newPass)) s++;
    return Math.min(s, 4);
  };

  const strengthLabel = ["", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"][strength()];
  const strengthColor = ["", "bg-red-500", "bg-orange-500", "bg-[#00C853]", "bg-[#0042B2]"][strength()];

  const handleChange = async () => {
    if (!user?.email) return toast.error("Tài khoản không có email");
    if (!oldPass ||!newPass ||!confirmPass) return toast.error("Nhập đủ thông tin");
    if (newPass.length < 6) return toast.error("Mật khẩu tối thiểu 6 ký tự");
    if (newPass!== confirmPass) return toast.error("Mật khẩu mới không khớp");

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, oldPass);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPass);
      setShowSuccess(true);
      navigator.vibrate?.([10, 20, 10]);
      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 1500);
    } catch (err: any) {
      if (err.code === "auth/wrong-password") toast.error("Mật khẩu cũ sai");
      else if (err.code === "auth/weak-password") toast.error("Mật khẩu quá yếu");
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
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-black tracking-tight">Đổi mật khẩu</h1>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 p-6 shadow-sm space-y-5">
            {/* Old */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Mật khẩu hiện tại</label>
              <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-[#0042B2]/30 focus-within:border-[#0042B2] transition-all">
                <Lock className="w-5 h-5 text-zinc-400" />
                <input type={showOld? "text" : "password"} value={oldPass} onChange={(e) => setOldPass(e.target.value)} className="flex-1 bg-transparent outline-none" placeholder="••••" />
                <button onClick={() => setShowOld(v =>!v)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg">
                  {showOld? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Mật khẩu mới</label>
              <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-[#0042B2]/30 focus-within:border-[#0042B2] transition-all">
                <Lock className="w-5 h-5 text-zinc-400" />
                <input type={showNew? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)} className="flex-1 bg-transparent outline-none" placeholder="Tối thiểu 6 ký tự" />
                <button onClick={() => setShowNew(v =>!v)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg">
                  {showNew? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPass && (
                <div className="mt-2.5">
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3, 4].map(i => (
                      <motion.div key={i} initial={{ width: 0 }} animate={{ width: "100%" }} className={`flex-1 rounded-full transition-all ${i <= strength()? strengthColor : "bg-zinc-200 dark:bg-zinc-800"}`} />
                    ))}
                  </div>
                  <p className="text-xs mt-1.5 text-zinc-500">Độ mạnh: <span className="font-semibold" style={{ color: strength() >= 3? "#00C853" : strength() === 2? "#FFB800" : "#FF3B30" }}>{strengthLabel}</span></p>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Nhập lại mật khẩu mới</label>
              <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-[#0042B2]/30 focus-within:border-[#0042B2] transition-all">
                <Lock className="w-5 h-5 text-zinc-400" />
                <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="flex-1 bg-transparent outline-none" placeholder="Nhập lại" />
                {confirmPass && newPass === confirmPass && <CheckCircle2 className="w-4 h-4 text-[#00C853]" />}
              </div>
            </div>

            <motion.button whileTap={{ scale: 0.98 }} onClick={handleChange} disabled={loading ||!oldPass ||!newPass ||!confirmPass} className="w-full h-12 rounded-2xl bg-[#0042B2] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0042B2]/25">
              {loading? <LottiePlayer animationData={loadingPull} loop autoplay className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              {loading? "Đang xử lý..." : "Đổi mật khẩu"}
            </motion.button>
          </motion.div>

          <div className="mt-4 bg-[#E8F1FF] dark:bg-[#0042B2]/10 border-[#0042B2]/20 rounded-2xl p-4">
            <p className="text-xs text-[#0042B2] dark:text-[#8AB4F8] leading-relaxed">• Mật khẩu nên có chữ hoa, số và ký tự đặc biệt\n• Không dùng lại mật khẩu cũ\n• Đổi xong sẽ đăng xuất các thiết bị khác</p>
          </div>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <div className="bg-white dark:bg-zinc-950 rounded-3xl p-8 shadow-2xl">
                <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-24 h-24 mx-auto" />
                <p className="text-center font-bold mt-3">Đổi mật khẩu thành công!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}