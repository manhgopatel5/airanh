"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  PhoneMultiFactorInfo,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { FiLoader, FiArrowLeft } from "react-icons/fi";
import { Smartphone, Shield, Check, AlertTriangle, Info } from "lucide-react";
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
  const [touched, setTouched] = useState({ phone: false, code: false });

  const recaptchaRef = useRef<HTMLDivElement>(null);

  // =========================
  // 🔐 LOAD MFA STATE
  // =========================
  useEffect(() => {
    if (!user) return;

    const factors = multiFactor(user).enrolledFactors;
    setEnabled(factors.length > 0);

    const factor = factors.find((f) => f.factorId === "phone");
    if (factor) {
      const phoneFactor = factor as PhoneMultiFactorInfo;
      setEnrolledPhone(phoneFactor.displayName || phoneFactor.phoneNumber || "");
    } else {
      setEnrolledPhone("");
    }
  }, [user]);

  // =========================
  // 🤖 INIT RECAPTCHA
  // =========================
  useEffect(() => {
    if (!recaptchaRef.current) return;

    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }

    window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
      size: "invisible",
      callback: () => console.log("reCAPTCHA solved"),
      "expired-callback": () => toast.error("reCAPTCHA hết hạn, thử lại"),
    });

    window.recaptchaVerifier.render().catch(console.error);
  }, );

  const validatePhone = (num: string) => {
    if (!num.trim()) return "Số điện thoại không được để trống";
    if (!/^(\+84|0)[35789][0-9]{8}$/.test(num)) return "Số điện thoại không hợp lệ";
    const formatted = num.startsWith("0")? `+84${num.slice(1)}` : num;
    if (formatted === user?.phoneNumber) return "SĐT mới phải khác SĐT hiện tại";
    return "";
  };

  const validateCode = (c: string) => {
    if (!c) return "Vui lòng nhập mã OTP";
    if (c.length!== 6) return "OTP phải đủ 6 số";
    return "";
  };

  const phoneError = touched.phone? validatePhone(phone) : "";
  const codeError = touched.code? validateCode(code) : "";

  const canSendOTP =!validatePhone(phone) && phone &&!loading;
  const canVerify =!validateCode(code) && code &&!loading;

  // =========================
  // 📩 SEND OTP
  // =========================
  const sendCode = async () => {
    if (!user) return toast.error("Chưa đăng nhập");
    setTouched((t) => ({...t, phone: true }));

    const err = validatePhone(phone);
    if (err) return toast.error(err);

    const formattedPhone = phone.startsWith("0")? `+84${phone.slice(1)}` : phone;

    if (!window.recaptchaVerifier) {
      return toast.error("reCAPTCHA chưa sẵn sàng, reload trang");
    }

    setLoading(true);
    try {
      const session = await multiFactor(user).getSession();
      const provider = new PhoneAuthProvider(auth);

      const verId = await provider.verifyPhoneNumber(
        {
          phoneNumber: formattedPhone,
          session,
        },
        window.recaptchaVerifier
      );

      setVerificationId(verId);
      setStep("verify");
      toast.success("Đã gửi OTP");
    } catch (err: any) {
      console.error("Send OTP error:", err);
      if (err.code === "auth/too-many-requests") {
        toast.error("Gửi quá nhiều lần. Thử lại sau");
      } else if (err.code === "auth/invalid-phone-number") {
        toast.error("SĐT không hợp lệ");
      } else if (err.code === "auth/captcha-check-failed") {
        toast.error("Lỗi reCAPTCHA. Reload trang");
      } else {
        toast.error("Gửi OTP thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ✅ ENABLE 2FA
  // =========================
  const enable2FA = async () => {
    if (!user ||!verificationId) return toast.error("Thiếu phiên xác thực");
    setTouched((t) => ({...t, code: true }));

    const err = validateCode(code);
    if (err) return toast.error(err);

    setLoading(true);
    try {
      const cred = PhoneAuthProvider.credential(verificationId, code);
      const assertion = PhoneMultiFactorGenerator.assertion(cred);

      await multiFactor(user).enroll(assertion, phone);

      await updateDoc(doc(db, "users", user.uid), {
        "settings.2fa": true,
      });

      setEnabled(true);
      setEnrolledPhone(phone);
      setStep("idle");
      setPhone("");
      setCode("");
      setVerificationId("");
      setTouched({ phone: false, code: false });

      toast.success("Đã bật xác thực 2 lớp");
    } catch (err: any) {
      console.error("Enable 2FA error:", err);
      if (err.code === "auth/invalid-verification-code") {
        toast.error("OTP không đúng");
      } else if (err.code === "auth/code-expired") {
        toast.error("OTP đã hết hạn");
      } else {
        toast.error("Bật 2FA thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ❌ DISABLE 2FA
  // =========================
  const disable2FA = async () => {
    if (!user) return;
    if (!confirm("Tắt 2FA sẽ giảm bảo mật tài khoản. Tiếp tục?")) return;

    setLoading(true);
    try {
      const factors = multiFactor(user).enrolledFactors;
      const factor = factors.find((f) => f.factorId === "phone");

      if (factor) {
        await multiFactor(user).unenroll(factor);
        await updateDoc(doc(db, "users", user.uid), {
          "settings.2fa": false,
        });

        setEnabled(false);
        setEnrolledPhone("");
        toast.success("Đã tắt 2FA");
      }
    } catch (err) {
      console.error("Disable 2FA error:", err);
      toast.error("Tắt 2FA thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans flex flex-col">
      <Toaster richColors position="top-center" />
      <div ref={recaptchaRef} id="recaptcha-container" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-900">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2 active:opacity-50">
            <FiArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Xác thực 2 lớp</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 mt-6 pb-6">
        {/* STATUS */}
        <div
          className={`rounded-2xl px-4 py-3.5 mb-6 flex items-start gap-3 ${
            enabled
             ? "bg-green-50 dark:bg-green-950/30"
              : "bg-gray-50 dark:bg-zinc-900"
          }`}
        >
          <Shield
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              enabled? "text-green-600 dark:text-green-400" : "text-gray-400"
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={`text-xs font-semibold uppercase ${
                  enabled
                   ? "text-green-900 dark:text-green-200"
                    : "text-gray-500 dark:text-zinc-500"
                }`}
              >
                {enabled? "Đã bật" : "Chưa bật"}
              </div>
              {enabled && <Check className="w-4 h-4 text-green-600 dark:text-green-400" />}
            </div>
            <div
              className={`text-base font-medium ${
                enabled
                 ? "text-green-900 dark:text-green-100"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {enabled? `Bảo vệ bằng OTP gửi tới ${enrolledPhone}` : "Bật 2FA để yêu cầu OTP khi đăng nhập thiết bị lạ"}
            </div>
          </div>
        </div>

        {/* Form */}
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
            {!enabled && step === "idle" && (
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase">Số điện thoại mới</div>
                    <input
                      type="text"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={() => setTouched((t) => ({...t, phone: true }))}
                      placeholder="0901234567"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore
                      name="new_phone_field"
                      className="w-full text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
                {phoneError && (
                  <p className="text-xs text-red-500 mt-1 ml-8">{phoneError}</p>
                )}
              </div>
            )}

            {!enabled && step === "verify" && (
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase">Mã OTP</div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      onBlur={() => setTouched((t) => ({...t, code: true }))}
                      placeholder="123456"
                      maxLength={6}
                      autoComplete="one-time-code"
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore
                      name="otp_field"
                      className="w-full text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-0 tracking-[0.3em]"
                    />
                  </div>
                </div>
                {codeError && (
                  <p className="text-xs text-red-500 mt-1 ml-8">{codeError}</p>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Note */}
        {!enabled && (
          <div className="mt-4 flex items-start gap-2 px-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              Mất SĐT sẽ không thể đăng nhập. Hãy dùng số chính chủ.
            </p>
          </div>
        )}
      </div>

      {/* Nút Sticky bottom */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black pt-8">
        {!enabled && step === "idle" && (
          <button
            onClick={sendCode}
            disabled={!canSendOTP}
            className={`w-full px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
             !canSendOTP
               ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
                : "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
            }`}
          >
            {loading? (
              <>
                <FiLoader className="animate-spin" size={18} />
                Đang gửi...
              </>
            ) : (
              "Gửi mã OTP"
            )}
          </button>
        )}

        {!enabled && step === "verify" && (
          <div className="space-y-3">
            <button
              onClick={enable2FA}
              disabled={!canVerify}
              className={`w-full px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
               !canVerify
                 ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
                  : "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
              }`}
            >
              {loading? (
                <>
                  <FiLoader className="animate-spin" size={18} />
                  Đang xác thực...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Xác nhận & bật 2FA
                </>
              )}
            </button>
            <button
              onClick={() => {
                setStep("idle");
                setCode("");
                setTouched((t) => ({...t, code: false }));
              }}
              className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold text-sm active:scale-[0.98] transition"
            >
              Gửi lại OTP
            </button>
          </div>
        )}

        {enabled && (
          <button
            onClick={disable2FA}
            disabled={loading}
            className="w-full px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 bg-red-500 text-white shadow-lg shadow-red-500/30 disabled:opacity-50"
          >
            {loading? (
              <>
                <FiLoader className="animate-spin" size={18} />
                Đang tắt...
              </>
            ) : (
              "Tắt 2FA"
            )}
          </button>
        )}
      </div>
    </div>
  );
}