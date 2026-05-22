"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { FiLoader, FiArrowLeft, FiEye, FiEyeOff } from "react-icons/fi";
import { Lock, ShieldCheck } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ old: false, new: false, confirm: false });

  const validateOldPass = (pass: string) => {
    if (!pass) return "Vui lòng nhập mật khẩu hiện tại";
    if (pass.length < 6) return "Mật khẩu tối thiểu 6 ký tự";
    return "";
  };

  const validateNewPass = (pass: string) => {
    if (!pass) return "Vui lòng nhập mật khẩu mới";
    if (pass.length < 6) return "Mật khẩu tối thiểu 6 ký tự";
    if (pass === oldPass) return "Mật khẩu mới phải khác mật khẩu cũ";
    return "";
  };

  const validateConfirmPass = (pass: string) => {
    if (!pass) return "Vui lòng nhập lại mật khẩu mới";
    if (pass !== newPass) return "Mật khẩu không khớp";
    return "";
  };

  const oldPassError = touched.old ? validateOldPass(oldPass) : "";
  const newPassError = touched.new ? validateNewPass(newPass) : "";
  const confirmPassError = touched.confirm ? validateConfirmPass(confirmPass) : "";

  const canSubmit =
    !validateOldPass(oldPass) &&
    !validateNewPass(newPass) &&
    !validateConfirmPass(confirmPass) &&
    oldPass &&
    newPass &&
    confirmPass &&
    !loading;

  const handleChange = async () => {
    if (!user) return toast.error("Chưa đăng nhập");
    if (!user.email) return toast.error("Tài khoản không có email");

    setTouched({ old: true, new: true, confirm: true });

    const errOld = validateOldPass(oldPass);
    const errNew = validateNewPass(newPass);
    const errConfirm = validateConfirmPass(confirmPass);

    if (errOld || errNew || errConfirm) {
      return toast.error(errOld || errNew || errConfirm);
    }

    setLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, oldPass);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPass);

      toast.success("Đổi mật khẩu thành công");
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      console.error("Change password error:", err);
      if (err.code === "auth/wrong-password") {
        toast.error("Mật khẩu cũ không đúng");
      } else if (err.code === "auth/weak-password") {
        toast.error("Mật khẩu mới quá yếu");
      } else if (err.code === "auth/requires-recent-login") {
        toast.error("Phiên hết hạn. Vui lòng đăng nhập lại");
      } else {
        toast.error("Đổi mật khẩu thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans flex flex-col">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-900">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2 active:opacity-50">
            <FiArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Đổi mật khẩu</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 mt-6 pb-6">
        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl px-4 py-3.5 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-blue-900 dark:text-blue-200 font-semibold uppercase">
              Bảo mật
            </div>
            <div className="text-base font-medium text-blue-900 dark:text-blue-100">
              Mật khẩu mạnh giúp bảo vệ tài khoản tốt hơn
            </div>
          </div>
        </div>

        {/* Form */}
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
            {/* Mật khẩu hiện tại */}
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase">Mật khẩu hiện tại</div>
                  <div className="flex items-center gap-2">
                    <input
                      type={showOld ? "text" : "password"}
                      value={oldPass}
                      onChange={(e) => setOldPass(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, old: true }))}
                      placeholder="Nhập mật khẩu cũ"
                      autoComplete="current-password"
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore
                      name="current_password_field"
                      className="flex-1 text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      className="p-1 active:opacity-50"
                    >
                      {showOld ? (
                        <FiEyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <FiEye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {oldPassError && (
                <p className="text-xs text-red-500 mt-1 ml-8">{oldPassError}</p>
              )}
            </div>

            {/* Mật khẩu mới */}
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-sky-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase">Mật khẩu mới</div>
                  <div className="flex items-center gap-2">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, new: true }))}
                      placeholder="Tối thiểu 6 ký tự"
                      autoComplete="new-password"
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore
                      name="new_password_field"
                      className="flex-1 text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="p-1 active:opacity-50"
                    >
                      {showNew ? (
                        <FiEyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <FiEye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {newPassError && (
                <p className="text-xs text-red-500 mt-1 ml-8">{newPassError}</p>
              )}
            </div>

            {/* Nhập lại mật khẩu mới */}
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase">Nhập lại mật khẩu mới</div>
                  <div className="flex items-center gap-2">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                      placeholder="Xác nhận mật khẩu"
                      autoComplete="new-password"
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore
                      name="confirm_password_field"
                      className="flex-1 text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="p-1 active:opacity-50"
                    >
                      {showConfirm ? (
                        <FiEyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <FiEye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {confirmPassError && (
                <p className="text-xs text-red-500 mt-1 ml-8">{confirmPassError}</p>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Nút Sticky bottom */}
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
            "Đổi mật khẩu"
          )}
        </button>
      </div>
    </div>
  );
}