"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  PhoneAuthProvider,
  RecaptchaVerifier,
  updatePhoneNumber,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { ChevronLeft, Smartphone, Lock, Check, Shield } from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";

import celebrate from "@/public/lotties/huha-celebrate.json";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

declare global { interface Window { recaptchaVerifier?: RecaptchaVerifier; } }

export default function ChangePhonePage() {
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<"password" | "phone" | "otp">("password");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!recaptchaRef.current || window.recaptchaVerifier) return;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, { size: "invisible" });
  }, [auth]);

  const verifyPassword = async () => {
    if (!user?.email ||!password) return toast.error("Nhập mật khẩu");
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      setStep("phone");
      toast.success("Xác thực thành công");
      navigator.vibrate?.(5);
    } catch {
      toast.error("Mật khẩu sai");
    } finally { setLoading(false); }
  };

  const sendOTP = async () => {
    if (!user ||!phone) return toast.error("Nhập số điện thoại");
    if (!/^(\+84|0)[3|5|7|8|9][0-9]{8}$/.test(phone)) return toast.error("SĐT không hợp lệ");
    const formattedPhone = phone.startsWith("0")? `+84${phone.slice(1)}` : phone;
    setLoading(true);
    try {
      const provider = new PhoneAuthProvider(auth);
      const verId = await provider.verifyPhoneNumber(formattedPhone, window.recaptchaVerifier!);
      setVerificationId(verId);
      setStep("otp");
      toast.success("Đã gửi OTP");
      navigator.vibrate?.(5);
    } catch { toast.error("Gửi OTP thất bại"); }
    finally { setLoading(false); }
  };

  const confirmOTP = async () => {
    if (!user ||!otp || otp.length!== 6) return toast.error("Nhập đủ 6 số OTP");
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      await updatePhoneNumber(user, credential);
      await updateDoc(doc(db, "users", user.uid), { phone });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 1500);
      navigator.vibrate?.([10, 20, 10]);
    } catch (err: any) {
      if (err.code === "auth/invalid-verification-code") toast.error("OTP sai");
      else toast.error("Thất bại");
    } finally { setLoading(false); }
  };

  const steps = [
    { key: "password", label: "Xác thực", icon: Lock },
    { key: "phone", label: "SĐT mới", icon: Smartphone },
    { key: "otp", label: "OTP", icon: Check },
  ];
  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <>
      <Toaster richColors position="top-center" />
      <div ref={recaptchaRef} />
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-28">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center shadow-lg shadow-[#0042B2]/20">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-black tracking-tight">Đổi số điện thoại</h1>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-6">
          {/* Progress */}
          <div className="flex items-center justify-between mb-8 px-2">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = idx === currentStepIndex;
              const isDone = idx < currentStepIndex;
              return (
                <div key={s.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1.5">
                    <motion.div animate={{ scale: isActive? 1.1 : 1 }} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isDone || isActive? "bg-[#0042B2] text-white shadow-lg shadow-[#0042B2]/25" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"}`}>
                      <Icon className="w-5 h-5" />
                    </motion.div>
                    <span className={`text- font-semibold ${isActive? "text-[#0042B2]" : "text-zinc-500"}`}>{s.label}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden rounded-full">
                      <motion.div initial={{ width: 0 }} animate={{ width: isDone? "100%" : "0%" }} className="absolute h-full bg-[#0042B2] rounded-full" transition={{ duration: 0.4 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", damping: 25 }} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 p-6 shadow-sm">
              {step === "password" && (
                <div className="space-y-5">
                  <div className="bg-[#E8F1FF] dark:bg-[#0042B2]/10 border-[#0042B2]/20 rounded-2xl p-4">
                    <p className="text-sm text-[#0042B2] dark:text-[#8AB4F8]">Nhập mật khẩu để xác thực trước khi đổi SĐT</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Mật khẩu hiện tại</label>
                    <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-[#0042B2]/30 focus-within:border-[#0042B2] transition-all">
                      <Lock className="w-5 h-5 text-zinc-400" />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập để xác nhận" className="flex-1 bg-transparent outline-none" onKeyDown={(e) => e.key === "Enter" && verifyPassword()} />
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.98 }} onClick={verifyPassword} disabled={loading ||!password} className="w-full h-12 rounded-2xl bg-[#0042B2] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0042B2]/25">
                    {loading? <LottiePlayer animationData={loadingPull} loop autoplay className="w-5 h-5" /> : null}
                    {loading? "Đang xác thực..." : "Tiếp tục"}
                  </motion.button>
                </div>
              )}

              {step === "phone" && (
                <div className="space-y-5">
                  <div className="bg-[#E8F1FF] dark:bg-[#0042B2]/10 border border-[#0042B2]/20 rounded-2xl p-4">
                    <p className="text-sm text-[#0042B2] dark:text-[#8AB4F8]">SĐT hiện tại: <strong>{user?.phoneNumber || "Chưa có"}</strong></p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Số điện thoại mới</label>
                    <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-[#0042B2]/30 focus-within:border-[#0042B2] transition-all">
                      <Smartphone className="w-5 h-5 text-zinc-400" />
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" className="flex-1 bg-transparent outline-none" onKeyDown={(e) => e.key === "Enter" && sendOTP()} />
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.98 }} onClick={sendOTP} disabled={loading ||!phone} className="w-full h-12 rounded-2xl bg-[#0042B2] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0042B2]/25">
                    {loading? <LottiePlayer animationData={loadingPull} loop autoplay className="w-5 h-5" /> : null}
                    {loading? "Đang gửi..." : "Gửi mã OTP"}
                  </motion.button>
                </div>
              )}

              {step === "otp" && (
                <div className="space-y-5">
                  <div className="bg-[#E8F5E9] dark:bg-green-950/30 border border-green-500/20 rounded-2xl p-4">
                    <p className="text-sm text-green-700 dark:text-green-400">Đã gửi OTP tới <strong>{phone}</strong></p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block text-center">Nhập mã OTP</label>
                    <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="000" maxLength={6} className="w-full h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-center text-3xl font-black tracking- tracking-widest outline-none focus:ring-2 focus:ring-[#0042B2]/30 focus:border-[#0042B2]" onKeyDown={(e) => e.key === "Enter" && otp.length === 6 && confirmOTP()} />
                  </div>
                  <div className="flex gap-3">
                    <motion.button whileTap={{ scale: 0.98 }} onClick={() => setStep("phone")} className="flex-1 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 font-semibold">Gửi lại</motion.button>
                    <motion.button whileTap={{ scale: 0.98 }} onClick={confirmOTP} disabled={loading || otp.length!== 6} className="flex-1 h-12 rounded-2xl bg-[#0042B2] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0042B2]/25">
                      {loading? <LottiePlayer animationData={loadingPull} loop autoplay className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                      Xác nhận
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <div className="bg-white dark:bg-zinc-950 rounded-3xl p-8 shadow-2xl">
                <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-24 h-24 mx-auto" />
                <p className="text-center font-bold mt-3">Đổi SĐT thành công!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}