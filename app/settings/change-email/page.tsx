"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  updateEmail,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { FiLoader, FiArrowLeft, FiEye, FiEyeOff } from "react-icons/fi";
import { Mail, Lock, ShieldCheck, Info } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function ChangeEmailPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();

  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const validateEmail = (email: string) => {
    if (!email.trim()) return "Email không được để trống";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email không hợp lệ";
    if (email === user?.email) return "Email mới phải khác email hiện tại";
    return "";
  };

  const validatePassword = (pass: string) => {
    if (!pass) return "Vui lòng nhập mật khẩu";
    if (pass.length < 6) return "Mật khẩu tối thiểu 6 ký tự";
    return "";
  };

  const emailError = touched.email ? validateEmail(newEmail) : "";
  const passwordError = touched.password ? validatePassword(password) : "";
  const canSubmit = !emailError && !passwordError && newEmail && password && !loading;

  const handleChange = async () => {
    if (!user) return toast.error("Chưa đăng nhập");
    if (!user.email) return toast.error("Tài khoản không có email");

    setTouched({ email: true, password: true });

    const emailErr = validateEmail(newEmail);
    const passErr = validatePassword(password);
    if (emailErr || passErr) {
      toast.error(emailErr || passErr);
      return;
    }

    setLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, newEmail);
      await sendEmailVerification(user);

      await updateDoc(doc(db, "users", user.uid), {
        email: newEmail,
        emailVerified: false,
      });

      toast.success("Đã gửi link xác thực tới email mới");
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        toast.error("Mật khẩu không đúng");
      } else if (err.code === "auth/email-already-in-use") {
        toast.error("Email đã được sử dụng");
      } else if (err.code === "auth/invalid-email") {
        toast.error("Email không hợp lệ");
      } else if (err.code === "auth/requires-recent-login") {
        toast.error("Phiên hết hạn. Vui lòng đăng nhập lại");
      } else if (err.code === "auth/too-many-requests") {
        toast.error("Thử lại sau ít phút");
      } else {
        toast.error("Có lỗi xảy ra");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans flex flex-col">
      <Toaster richColors position="top-center" />

      {/* Header - đồng bộ với ProfileEditPage */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-900">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2 active:opacity-50">
            <FiArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Đổi email</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 mt-6 pb-6">
        {/* Email hiện tại */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl px-4 py-3.5 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-blue-900 dark:text-blue-200 font-semibold uppercase">
              Email hiện tại
            </div>
            <div className="text-base font-medium text-blue-900 dark:text-blue-100 break-all">
              {user?.email || "N/A"}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
       {/* Email mới */}
<div className="px-4 py-3.5">
  <div className="flex items-center gap-3">
    <Mail className="w-5 h-5 text-sky-500 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase">Email mới</div>
      <input
        type="email"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        placeholder="example@gmail.com"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
        data-1p-ignore
        data-lpignore="true"
        className="w-full text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-0"
      />
    </div>
  </div>
  {emailError && (
    <p className="text-xs text-red-500 mt-1 ml-8">{emailError}</p>
  )}
</div>

{/* Mật khẩu */}
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
          data-1p-ignore
          data-lpignore="true"
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
        </div>

        {/* Note */}
        <div className="mt-4 flex items-start gap-2 px-2">
          <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 dark:text-zinc-500">
            Bạn cần xác thực email mới qua link được gửi về hộp thư trước khi sử dụng
          </p>
        </div>
      </div>

      {/* Nút Đổi email - Sticky bottom */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black pt-8">
        <button
          onClick={handleChange}
          disabled={!canSubmit}
          className={`w-full px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
            !canSubmit
              ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
              : "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
          }`}
        >
          {loading ? (
            <>
              <FiLoader className="animate-spin" size={18} />
              Đang xử lý...
            </>
          ) : (
            "Đổi email"
          )}
        </button>
      </div>
    </div>
  );
}