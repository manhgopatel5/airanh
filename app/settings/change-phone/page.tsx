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
import { ChevronLeft, Smartphone, Lock, Check } from "lucide-react";
import { toast, Toaster } from "sonner";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

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
  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!recaptchaRef.current || window.recaptchaVerifier) return;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
      size: "invisible",
    });
  }, []);

  const verifyPassword = async () => {
    if (!user?.email || !password) return toast.error("Nhập mật khẩu");
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      setStep("phone");
      toast.success("Xác thực thành công");
    } catch {
      toast.error("Mật khẩu sai");
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    if (!user || !phone) return toast.error("Nhập số điện thoại");
    if (!/^(\+84|0)[3|5|7|8|9][0-9]{8}$/.test(phone)) return toast.error("SĐT không hợp lệ");
    
    const formattedPhone = phone.startsWith("0")? `+84${phone.slice(1)}` : phone;
    setLoading(true);
    try {
      const provider = new PhoneAuthProvider(auth);
      const verId = await provider.verifyPhoneNumber(formattedPhone, window.recaptchaVerifier!);
      setVerificationId(verId);
      setStep("otp");
      toast.success("Đã gửi OTP");
    } catch (err: any) {
      toast.error("Gửi OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const confirmOTP = async () => {
    if (!user || !otp || otp.length !== 6) return toast.error("Nhập đủ 6 số OTP");
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      await updatePhoneNumber(user, credential);
      await updateDoc(doc(db, "users", user.uid), { phone });
      toast.success("Đổi SĐT thành công");
      router.back();
    } catch (err: any) {
      if (err.code === "auth/invalid-verification-code") toast.error("OTP sai");
      else toast.error("Thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />
      <div ref={recaptchaRef} />

      <div className="px-6 pt-12 pb-6 flex items-center gap-3 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-90 transition">
          <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Đổi số điện thoại</h1>
      </div>

      <div className="px-6 space-y-5">
        {step === "password" && (
          <>
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-4">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                Nhập mật khẩu để xác thực trước khi đổi SĐT
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2 block">Mật khẩu hiện tại</label>
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-900">
                <Lock className="w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập để xác nhận"
                  className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={verifyPassword}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-sky-500 text-white font-semibold active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading? "Đang xác thực..." : "Tiếp tục"}
            </button>
          </>
        )}

        {step === "phone" && (
          <>
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-4">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                SĐT hiện tại: <strong>{user?.phoneNumber || "Chưa có"}</strong>
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2 block">Số điện thoại mới</label>
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-900">
                <Smartphone className="w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                  className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={sendOTP}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-sky-500 text-white font-semibold active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading? "Đang gửi..." : "Gửi mã OTP"}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="bg-green-50 dark:bg-green-950/30 rounded-2xl p-4">
              <p className="text-sm text-green-900 dark:text-green-200">
                Đã gửi OTP tới <strong>{phone}</strong>
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2 block">Nhập mã OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-900 text-center text-2xl font-bold tracking-widest text-gray-900 dark:text-white outline-none"
              />
            </div>

            <button
              onClick={confirmOTP}
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 rounded-2xl bg-sky-500 text-white font-semibold active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading? "Đang xác thực..." : <><Check className="w-5 h-5" />Xác nhận & Đổi SĐT</>}
            </button>

            <button
              onClick={() => setStep("phone")}
              className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold active:scale-[0.98] transition"
            >
              Gửi lại OTP
            </button>
          </>
        )}
      </div>
    </div>
  );
}