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
import { FiLoader, FiArrowLeft, FiEye, FiEyeOff } from "react-icons/fi";
import { Smartphone, Lock, ShieldCheck, Info, Check } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ password: false, phone: false, otp: false });
  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!recaptchaRef.current) return;
    
    // Clear cũ nếu có
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }

    window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
      size: "invisible",
      callback: () => {
        console.log("reCAPTCHA solved");
      },
      "expired-callback": () => {
        toast.error("reCAPTCHA hết hạn, thử lại");
      },
    });

    // Render ngay
    window.recaptchaVerifier.render().catch(console.error);
  }, [auth]);

  const validatePassword = (pass: string) => {
    if (!pass) return "Vui lòng nhập mật khẩu";
    if (pass.length < 6) return "Mật khẩu tối thiểu 6 ký tự";
    return "";
  };

  const validatePhone = (num: string) => {
    if (!num.trim()) return "Số điện thoại không được để trống";
    if (!/^(\+84|0)[35789][0-9]{8}$/.test(num)) return "Số điện thoại không hợp lệ";
    const formatted = num.startsWith("0") ? `+84${num.slice(1)}` : num;
    if (formatted === user?.phoneNumber) return "SĐT mới phải khác SĐT hiện tại";
    return "";
  };

  const validateOTP = (code: string) => {
    if (!code) return "Vui lòng nhập mã OTP";
    if (code.length !== 6) return "OTP phải đủ 6 số";
    return "";
  };

  const passwordError = touched.password ? validatePassword(password) : "";
  const phoneError = touched.phone ? validatePhone(phone) : "";
  const otpError = touched.otp ? validateOTP(otp) : "";

  const canSubmitPassword = !validatePassword(password) && password && !loading;
  const canSubmitPhone = !validatePhone(phone) && phone && !loading;
  const canSubmitOTP = !validateOTP(otp) && otp && !loading;

  const verifyPassword = async () => {
    if (!user?.email) return toast.error("Tài khoản không có email");
    setTouched((t) => ({ ...t, password: true }));

    const err = validatePassword(password);
    if (err) return toast.error(err);

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      setStep("phone");
      toast.success("Xác thực thành công");
    } catch {
      toast.error("Mật khẩu không đúng");
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    if (!user) return toast.error("Chưa đăng nhập");
    setTouched((t) => ({ ...t, phone: true }));

    const err = validatePhone(phone);
    if (err) return toast.error(err);

    const formattedPhone = phone.startsWith("0") ? `+84${phone.slice(1)}` : phone;
    
    if (!window.recaptchaVerifier) {
      return toast.error("reCAPTCHA chưa sẵn sàng, reload trang");
    }

    setLoading(true);
    try {
      const provider = new PhoneAuthProvider(auth);
      const verId = await provider.verifyPhoneNumber(formattedPhone, window.recaptchaVerifier);
      setVerificationId(verId);
      setStep("otp");
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

  const confirmOTP = async () => {
    if (!user) return toast.error("Chưa đăng nhập");
    setTouched((t) => ({ ...t, otp: true }));

    const err = validateOTP(otp);
    if (err) return toast.error(err);

    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      await updatePhoneNumber(user, credential);

      const formattedPhone = phone.startsWith("0") ? `+84${phone.slice(1)}` : phone;
      await updateDoc(doc(db, "users", user.uid), { phone: formattedPhone });

      toast.success("Đổi SĐT thành công");
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      console.error("Confirm OTP error:", err);
      if (err.code === "auth/invalid-verification-code") {
        toast.error("Mã OTP không đúng");
      } else if (err.code === "auth/code-expired") {
        toast.error("Mã OTP đã hết hạn");
      } else {
        toast.error("Xác thực thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans flex flex-col">
      <Toaster richColors position="top-center" />
      
      {/* reCAPTCHA container - PHẢI VISIBLE */}
      <div ref={recaptchaRef} id="recaptcha-container" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-900">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2 active:opacity-50">
            <FiArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Đổi số điện thoại</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 mt-6 pb-6">
        {/* SĐT hiện tại */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl px-4 py-3.5 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-blue-900 dark:text-blue-200 font-semibold uppercase">
              SĐT hiện tại
            </div>
            <div className="text-base font-medium text-blue-900 dark:text-blue-100">
              {user?.phoneNumber || "Chưa có"}
            </div>
          </div>
        </div>

        {/* Form */}
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
            {step === "password" && (
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase">Mật khẩu hiện tại</div>
                    <div className="flex items-center gap-2">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                        placeholder="Nhập để xác nhận"
                        autoComplete="current-password"
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore
                        name="current_password_field"
                        className="flex-1 text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 active:opacity-50"
                      >
                        {showPassword ? (
                          <FiEyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <FiEye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                {passwordError && (
                  <p className="text-xs text-red-500 mt-1 ml-8">{passwordError}</p>
                )}
              </div>
            )}

            {step === "phone" && (
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
                      onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
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

            {step === "otp" && (
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase">Mã OTP</div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      onBlur={() => setTouched((t) => ({ ...t, otp: true }))}
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
                {otpError && (
                  <p className="text-xs text-red-500 mt-1 ml-8">{otpError}</p>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Note */}
        <div className="mt-4 flex items-start gap-2 px-2">
          <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 dark:text-zinc-500">
            {step === "password" && "Nhập mật khẩu để xác thực trước khi đổi SĐT"}
            {step === "phone" && "Mã OTP sẽ được gửi về SĐT mới để xác nhận"}
            {step === "otp" && `Đã gửi OTP tới ${phone}`}
          </p>
        </div>
      </div>

      {/* Nút Sticky bottom */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black pt-8">
        {step === "password" && (
          <button
            onClick={verifyPassword}
            disabled={!canSubmitPassword}
            className={`w-full px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
              !canSubmitPassword
                ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
                : "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
            }`}
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" size={18} />
                Đang xác thực...
              </>
            ) : (
              "Tiếp tục"
            )}
          </button>
        )}

        {step === "phone" && (
          <button
            onClick={sendOTP}
            disabled={!canSubmitPhone}
            className={`w-full px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
              !canSubmitPhone
                ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
                : "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
            }`}
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" size={18} />
                Đang gửi...
              </>
            ) : (
              "Gửi mã OTP"
            )}
          </button>
        )}

        {step === "otp" && (
          <div className="space-y-3">
            <button
              onClick={confirmOTP}
              disabled={!canSubmitOTP}
              className={`w-full px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
                !canSubmitOTP
                  ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
                  : "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
              }`}
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" size={18} />
                  Đang xác thực...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Xác nhận & Đổi SĐT
                </>
              )}
            </button>
            <button
              onClick={() => {
                setStep("phone");
                setOtp("");
                setTouched((t) => ({ ...t, otp: false }));
              }}
              className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold text-sm active:scale-[0.98] transition"
            >
              Gửi lại OTP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}