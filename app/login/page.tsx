"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from "react-icons/fi";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendEmailVerification,
  Auth,
} from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Firestore,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import { toast, Toaster } from "sonner";
import InstallPrompt from "@/components/InstallPrompt";
import { motion } from "framer-motion";

export default function Login() {
  const router = useRouter();

  const authRef = useRef<Auth | null>(null);
  const dbRef = useRef<Firestore | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    honeypot: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  const failedAttempts = useRef(0);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    authRef.current = getFirebaseAuth();
    dbRef.current = getFirebaseDB();
  }, []);

  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    };
  }, []);

  const validateField = (field: string, value: string) => {
    if (field === "email") {
      if (!value) return "Vui lòng nhập email";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return "Email không hợp lệ";
    }
    if (field === "password" &&!value)
      return "Vui lòng nhập mật khẩu";
    return "";
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    (["email", "password"] as const).forEach((key) => {
      const err = validateField(key, form[key]);
      if (err) newErrors[key] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (form.honeypot) return;

    const auth = authRef.current;
    const db = dbRef.current;

    if (!auth ||!db) {
      toast.error("Firebase chưa sẵn sàng");
      return;
    }

    const lastFail = localStorage.getItem("login_fail_time");

    if (
      failedAttempts.current >= 3 &&
      lastFail &&
      Date.now() - parseInt(lastFail) < 30000
    ) {
      setErrors({ submit: "Thử quá nhiều lần, đợi 30s" });
      return;
    }

    if (!validate()) return;

    try {
      setLoading(true);
      setErrors({});

      await setPersistence(
        auth,
        remember
         ? browserLocalPersistence
          : browserSessionPersistence
      );

      const res = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const user = res.user;

      if (!user.emailVerified) {
        toast.warning("Vui lòng xác thực email trước");
        await sendEmailVerification(user).catch(() => {});
        router.replace("/verify-email");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef).catch(() => null);

      if (!snap ||!snap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          name: user.email?.split("@")[0] || "User",
          avatar:
            user.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              user.email || "U"
            )}&background=random`,
          shortId: nanoid(6).toUpperCase(),
          online: true,
          lastSeen: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } else {
        const data = snap.data() || {};
        const updates: any = {
          online: true,
          lastSeen: serverTimestamp(),
        };
        if (!data.shortId) updates.shortId = nanoid(6).toUpperCase();
        await updateDoc(userRef, updates);
      }

      failedAttempts.current = 0;
      localStorage.removeItem("login_fail_time");

      toast.success("Đăng nhập thành công");
      router.replace("/");
    } catch (err: any) {
      failedAttempts.current++;
      localStorage.setItem("login_fail_time", Date.now().toString());

      const errorMap: Record<string, string> = {
        "auth/invalid-credential": "Email hoặc mật khẩu không đúng",
        "auth/user-not-found": "Tài khoản không tồn tại",
        "auth/wrong-password": "Mật khẩu không đúng",
        "auth/too-many-requests": "Thử quá nhiều lần",
        "auth/network-request-failed": "Lỗi mạng",
      };

      setErrors({
        submit: errorMap[err.code] || "Đăng nhập thất bại",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShowPass = () => {
    setShow(!show);
    if (!show) {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = setTimeout(() => setShow(false), 3000);
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <InstallPrompt />

      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-6">
              Đăng nhập
            </h1>

            {errors.submit && (
              <div className="text-red-500 mb-4 flex items-center gap-2 text-sm">
                <FiAlertCircle size={16} /> {errors.submit}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="text"
                className="hidden"
                value={form.honeypot}
                onChange={(e) =>
                  setForm({...form, honeypot: e.target.value })
                }
              />

              <div>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm ${
                      errors.email? "border-red-500" : "border-gray-300 dark:border-zinc-700"
                    } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none transition-all`}
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => {
                      setForm({...form, email: e.target.value });
                      if (errors.email) setErrors({...errors, email: "" });
                    }}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={show? "text" : "password"}
                    className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm ${
                      errors.password? "border-red-500" : "border-gray-300 dark:border-zinc-700"
                    } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none transition-all`}
                    placeholder="Mật khẩu"
                    value={form.password}
                    onChange={(e) => {
                      setForm({...form, password: e.target.value });
                      if (errors.password) setErrors({...errors, password: "" });
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={handleShowPass}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {show? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-zinc-700 text-gray-900 focus:ring-gray-400"
                />
                <span className="text-sm text-gray-700 dark:text-zinc-300">Ghi nhớ đăng nhập</span>
              </label>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm bg-gray-900 dark:bg-gray-100 dark:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading? "Đang đăng nhập..." : "Đăng nhập"}
              </motion.button>
            </form>

            <p className="text-center text-sm text-gray-600 dark:text-zinc-400 mt-4">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="font-semibold text-gray-900 dark:text-gray-100 hover:underline">
                Đăng ký
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}