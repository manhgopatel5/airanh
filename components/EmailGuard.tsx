"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { toast } from "sonner";
import { FiMail, FiX, FiLoader } from "react-icons/fi";

export default function EmailGuard({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Các route public không cần verify
  const publicRoutes = ["/login", "/register", "/forgot-password"];

  useEffect(() => {
    if (!loading && user &&!user.emailVerified &&!publicRoutes.includes(pathname)) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [user, loading, pathname]);

  const resendEmail = async () => {
    if (!user || sending) return;
    setSending(true);
    try {
      await sendEmailVerification(user);
      toast.success("Đã gửi lại email xác minh");
    } catch (e: any) {
      toast.error(e.message || "Gửi email thất bại");
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    const { getFirebaseAuth } = await import("@/lib/firebase");
    await getFirebaseAuth().signOut();
    router.push("/login");
  };

  // Đang load hoặc route public thì render bình thường
  if (loading || publicRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      {/* Modal chặn toàn app */}
      {showModal && user &&!user.emailVerified && (
        <div className="fixed inset-0 z-[9999] backdrop-blur-2xl bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30">
              <FiMail className="text-white" size={32} />
            </div>

            <h2 className="text-2xl font-black text-center text-gray-900 dark:text-white mb-2">
              Xác minh email
            </h2>
            <p className="text- text-gray-500 dark:text-zinc-400 text-center mb-2">
              Vui lòng xác minh email để tiếp tục sử dụng
            </p>
            <p className="text- font-bold text-blue-600 dark:text-blue-400 text-center mb-6">
              {user.email}
            </p>

            <button
              onClick={resendEmail}
              disabled={sending}
              className="w-full h-14 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text- rounded-2xl shadow-xl shadow-blue-500/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
            >
              {sending? (
                <>
                  <FiLoader className="animate-spin" size={20} />
                  Đang gửi...
                </>
              ) : (
                "Gửi lại email xác minh"
              )}
            </button>

            <button
              onClick={handleLogout}
              className="w-full h-12 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold rounded-2xl active:scale-95 transition-all"
            >
              Đăng xuất
            </button>

            <p className="text-xs text-gray-400 dark:text-zinc-500 text-center mt-6">
              Kiểm tra cả thư mục Spam nếu không thấy email
            </p>
          </div>
        </div>
      )}
    </>
  );
}