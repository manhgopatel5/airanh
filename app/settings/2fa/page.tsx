"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier
} from "firebase/auth";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { ChevronLeft, Smartphone, Shield, Check, X, AlertTriangle } from "lucide-react";
import { toast, Toaster } from "sonner";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

export default function TwoFAPage() {
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();
  const router = useRouter();
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [step, setStep] = useState<"idle" | "verify">("idle");
  const [enrolledPhone, setEnrolledPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const factors = multiFactor(user).enrolledFactors;
    setEnabled(factors.length > 0);
    if (factors.length > 0) {
      setEnrolledPhone(factors[0].displayName || factors[0].phoneNumber || "");
    }
  }, );

  useEffect(() => {
    if (!recaptchaRef.current || window.recaptchaVerifier) return;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
      size: "invisible",
      callback: () => {},
    });
  }, []);

  const sendCode = async () => {
    if (!user ||!phone) return toast.error("Nhập số điện thoại");
    if (!/^(\+84|0)[3|5|7|8|9][0-9]{8}$/.test(phone)) return toast.error("SĐT không hợp lệ");

    const formattedPhone = phone.startsWith("0")? `+84${phone.slice(1)}` : phone;
    setLoading(true);
    try {
      const session = await multiFactor(user).getSession();
      const provider = new PhoneAuthProvider(auth);
      const verId = await provider.verifyPhoneNumber({
        phoneNumber: formattedPhone,
        session,
      }, window.recaptchaVerifier!);
      setVerificationId(verId);
      setStep("verify");
      toast.success("Đã gửi OTP");
    } catch (err: any) {
      if (err.code === "auth/too-many-requests") toast.error("Thử lại sau");
      else toast.error("Gửi OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const enable2FA = async () => {
    if (!user ||!code || code.length!== 6) return toast.error("Nhập đủ 6 số OTP");
    setLoading(true);
    try {
      const cred = PhoneAuthProvider.credential(verificationId, code);
      const assertion = PhoneMultiFactorGenerator.assertion(cred);
      await multiFactor(user).enroll(assertion, phone);
      await updateDoc(doc(db, "users", user.uid), { "settings.2fa": true });
      setEnabled(true);
      setEnrolledPhone(phone);
      setStep("idle");
      setPhone("");
      setCode("");
      toast.success("Đã bật xác thực 2 lớp");
    } catch (err: any) {
      if (err.code === "auth/invalid-verification-code") toast.error("OTP sai");
      else if (err.code === "auth/code-expired") toast.error("OTP hết hạn");
      else toast.error("Thất bại");
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!user) return;
    if (!confirm("Tắt 2FA sẽ giảm bảo mật tài khoản. Tiếp tục?")) return;
    setLoading(true);
    try {
      const factors = multiFactor(user).enrolledFactors;
      if (factors.length > 0) {
        await multiFactor(user).unenroll(factors[0]);
        await updateDoc(doc(db, "users", user.uid), { "settings.2fa": false });
        setEnabled(false);
        setEnrolledPhone("");
        toast.success("Đã tắt 2FA");
      }
    } catch {
      toast.error("Thất bại");
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
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Xác thực 2 lớp</h1>
      </div>

      <div className="px-6 space-y-5">
        {/* Trạng thái */}
        <div className={`rounded-2xl p-4 ${enabled? "bg-green-50 dark:bg-green-950/30" : "bg-gray-50 dark:bg-zinc-900"}`}>
          <div className="flex items-center gap-3 mb-2">
            <Shield className={`w-5 h-5 ${enabled? "text-green-600 dark:text-green-400" : "text-gray-400"}`} />
            <span className="font-bold text-gray-900 dark:text-white">
              {enabled? "Đã bật" : "Chưa bật"}
            </span>
            {enabled && <Check className="w-4 h-4 text-green-600 dark:text-green-400" />}
          </div>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            {enabled? `Bảo vệ bằng OTP gửi tới ${enrolledPhone}` : "Bật 2FA để yêu cầu OTP khi đăng nhập thiết bị lạ"}
          </p>
        </div>

        {!enabled && step === "idle" && (
          <>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">Lưu ý quan trọng</p>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Mất SĐT sẽ không thể đăng nhập. Hãy dùng số chính chủ.
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2 block">Số điện thoại</label>
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
              onClick={sendCode}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-sky-500 text-white font-semibold active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading? "Đang gửi..." : "Gửi mã OTP"}
            </button>
          </>
        )}

        {!enabled && step === "verify" && (
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
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-900 text-center text-2xl font-bold tracking-widest text-gray-900 dark:text-white outline-none"
              />
            </div>

            <button
              onClick={enable2FA}
              disabled={loading || code.length!== 6}
              className="w-full py-3.5 rounded-2xl bg-sky-500 text-white font-semibold active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading? "Đang xác thực..." : <><Check className="w-5 h-5" />Xác nhận & Bật 2FA</>}
            </button>

            <button
              onClick={() => setStep("idle")}
              className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold active:scale-[0.98] transition"
            >
              Gửi lại OTP
            </button>
          </>
        )}

        {enabled && (
          <button
            onClick={disable2FA}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-semibold active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            {loading? "Đang xử lý..." : "Tắt xác thực 2 lớp"}
          </button>
        )}
      </div>
    </div>
  );
}