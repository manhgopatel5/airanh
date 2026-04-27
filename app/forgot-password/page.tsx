"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  sendPasswordResetEmail, 
  fetchSignInMethodsForEmail 
} from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast, Toaster } from "sonner";
import { FiMail, FiArrowLeft, FiAlertCircle, FiSend, FiCheck } from "react-icons/fi";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailRef = useRef<HTMLInputElement>(null);
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  
  const redirectTo = searchParams.get("redirect") || "/login";

  useEffect(() => {
    const lastEmail = localStorage.getItem("last_email");
    if (lastEmail) setEmail(lastEmail);
    setTimeout(() => emailRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const checkRateLimit = async (email: string) => {
    try {
      const rateLimitRef = doc(db, "rate_limits", email);
      const snap = await getDoc(rateLimitRef);
      
      if (snap.exists()) {
        const data = snap.data();
        const lastSent = data.lastResetSent?.toMillis() || 0;
        const diff = Date.now() - lastSent;
        
        if (diff < 60000) {
          return Math.ceil((60000 - diff) / 1000);
        }
      }
      return 0;
    } catch {
      return 0;
    }
  };

  const updateRateLimit = async (email: string) => {
    try {
      const rateLimitRef = doc(db, "rate_limits", email);
      await setDoc(rateLimitRef, {
        lastResetSent: serverTimestamp(),
        count: 1,
      }, { merge: true });
    } catch (err) {
      console.error("Rate limit update failed", err);
    }
  };

  const handleReset = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!email) {
      setError("Vui lòng nhập email");
      emailRef.current?.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email không hợp lệ");
      return;
    }

    if (cooldown > 0) return;

    try {
      setChecking(true);
      setError("");

      // 1. Check rate limit
      const waitTime = await checkRateLimit(email);
      if (waitTime > 0) {
        setCooldown(waitTime);
        setError(`Vui lòng đợi ${waitTime}s trước khi gửi lại`);
        setChecking(false);
        return;
      }

      // 2. Check email có tồn tại không
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length === 0) {
        setError("Email chưa đăng ký tài khoản");
        setChecking(false);
        return;
      }

      setChecking(false);
      setLoading(true);

      // 3. Gửi email
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + redirectTo,
      });

      await updateRateLimit(email);
      localStorage.setItem("last_email", email);
      setSent(true);
      setCooldown(60);
      toast.success("Đã gửi link đặt lại mật khẩu");
    } catch (err: any) {
      const errorMap: Record<string, string> = {
        "auth/invalid-email": "Email không hợp lệ",
        "auth/too-many-requests": "Gửi quá nhiều lần, thử lại sau",
        "auth/network-request-failed": "Lỗi mạng, kiểm tra kết nối",
      };
      setError(errorMap[err.code] || "Gửi email thất bại");
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />

      <div className="min-h-screen bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6"
          >
            <button
              onClick={() => router.back()}
              className="mb-4 w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-300 hover:bg-gray-50 active:scale-95 transition-all"
            >
              <FiArrowLeft className="text-gray-700" size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30">
                <FiMail className="text-white" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1.5">
                Quên mật khẩu?
              </h1>
              <p className="text-sm text-gray-600">
                {sent
             ? "Kiểm tra email để đặt lại mật khẩu"
                  : "Nhập email để nhận link đặt lại mật khẩu"}
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 px-3 py-2.5 rounded-lg mb-4 flex items-center gap-2 text-sm"
              >
                <FiAlertCircle size={16} className="flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {sent && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-sky-50 border border-sky-200 text-sky-700 px-3 py-2.5 rounded-lg mb-4 flex items-center gap-2 text-sm"
              >
                <FiCheck size={16} className="flex-shrink-0" />
                Đã gửi! Kiểm tra hộp thư và thư mục Spam
              </motion.div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    ref={emailRef}
                    type="email"
                    placeholder="Email của bạn"
                    autoComplete="email"
                    className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm ${
                      error? "border-red-500" : "border-gray-300"
                    } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none transition-all`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    disabled={sent && cooldown > 0}
                  />
                </div>
              </div>

              {cooldown > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: cooldown, ease: "linear" }}
                    className="bg-sky-500 h-full"
                  />
                </div>
              )}

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={loading || checking || (sent && cooldown > 0)}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/30"
              >
                {checking? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang kiểm tra...
                  </>
                ) : loading? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang gửi...
                  </>
                ) : cooldown > 0? (
                  <>
                    <FiSend size={18} />
                    Gửi lại sau {cooldown}s
                  </>
                ) : (
                  <>
                    <FiSend size={18} />
                    Gửi link đặt lại
                  </>
                )}
              </motion.button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-4">
              Nhớ mật khẩu?{" "}
              <Link href={`/login${redirectTo!== "/login"? `?redirect=${redirectTo}` : ""}`} className="font-semibold text-sky-600 hover:text-sky-700">
                Đăng nhập ngay
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}