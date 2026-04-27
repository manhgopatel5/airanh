"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { updateEmail, sendEmailVerification, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { ChevronLeft, Mail, Lock, Check } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function ChangeEmailPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!user || !newEmail || !password) return toast.error("Nhập đủ thông tin");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return toast.error("Email không hợp lệ");

    setLoading(true);
    try {
      // Re-authenticate trước
      const credential = EmailAuthProvider.credential(user.email!, password);
      await reauthenticateWithCredential(user, credential);
      
      // Update email
      await updateEmail(user, newEmail);
      await sendEmailVerification(user);
      await updateDoc(doc(db, "users", user.uid), { 
        email: newEmail,
        emailVerified: false 
      });
      
      toast.success("Đã gửi link xác thực tới email mới");
      router.back();
    } catch (err: any) {
      if (err.code === "auth/wrong-password") toast.error("Mật khẩu sai");
      else if (err.code === "auth/email-already-in-use") toast.error("Email đã được dùng");
      else toast.error("Thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      <div className="px-6 pt-12 pb-6 flex items-center gap-3 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-90 transition">
          <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Đổi email</h1>
      </div>

      <div className="px-6 space-y-5">
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-4">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            Email hiện tại: <strong>{user?.email}</strong>
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2 block">Email mới</label>
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-900">
            <Mail className="w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nhap@email.moi"
              className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white"
            />
          </div>
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
          onClick={handleChange}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-sky-500 text-white font-semibold active:scale-[0.98] transition disabled:opacity-50"
        >
          {loading? "Đang xử lý..." : "Đổi email"}
        </button>

        <p className="text-xs text-gray-500 dark:text-zinc-400 text-center">
          Bạn sẽ cần xác thực email mới trước khi sử dụng
        </p>
      </div>
    </div>
  );
}