"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { ChevronLeft, Lock, EyeOff, Eye } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!user) return toast.error("Chưa đăng nhập");

    if (!user.email) {
      return toast.error("Tài khoản không có email");
    }

    if (!oldPass || !newPass || !confirmPass) {
      return toast.error("Nhập đủ thông tin");
    }

    if (newPass.length < 6) {
      return toast.error("Mật khẩu tối thiểu 6 ký tự");
    }

    if (newPass !== confirmPass) {
      return toast.error("Mật khẩu mới không khớp");
    }

    setLoading(true);

    try {
      // 🔐 Re-auth
      const credential = EmailAuthProvider.credential(
        user.email,
        oldPass
      );

      await reauthenticateWithCredential(user, credential);

      // 🔑 Update password
      await updatePassword(user, newPass);

      toast.success("Đổi mật khẩu thành công");

      router.back();
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        toast.error("Mật khẩu cũ sai");
      } else if (err.code === "auth/weak-password") {
        toast.error("Mật khẩu quá yếu");
      } else if (err.code === "auth/requires-recent-login") {
        toast.error("Vui lòng đăng nhập lại");
      } else {
        toast.error("Thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      <div className="px-6 pt-12 pb-6 flex items-center gap-3 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 active:scale-90 transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="text-2xl font-extrabold">
          Đổi mật khẩu
        </h1>
      </div>

      <div className="px-6 space-y-5">
        {/* OLD PASS */}
        <div>
          <label className="text-sm font-semibold mb-2 block">
            Mật khẩu hiện tại
          </label>

          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-900">
            <Lock className="w-5 h-5 text-gray-400" />

            <input
              type={showOld ? "text" : "password"}
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              className="flex-1 bg-transparent outline-none"
            />

            <button onClick={() => setShowOld((v) => !v)}>
              {showOld ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        {/* NEW PASS */}
        <div>
          <label className="text-sm font-semibold mb-2 block">
            Mật khẩu mới
          </label>

          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-900">
            <Lock className="w-5 h-5 text-gray-400" />

            <input
              type={showNew ? "text" : "password"}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="flex-1 bg-transparent outline-none"
            />

            <button onClick={() => setShowNew((v) => !v)}>
              {showNew ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        {/* CONFIRM */}
        <div>
          <label className="text-sm font-semibold mb-2 block">
            Nhập lại mật khẩu mới
          </label>

          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-900">
            <Lock className="w-5 h-5 text-gray-400" />

            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="flex-1 bg-transparent outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleChange}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-sky-500 text-white disabled:opacity-50"
        >
          {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
        </button>
      </div>
    </div>
  );
}