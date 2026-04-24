"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation"; // ✅ THÊM usePathname
import Link from "next/link";
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from "react-icons/fi";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendEmailVerification,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { nanoid } from "nanoid";
import { toast, Toaster } from "sonner";
import InstallPrompt from "@/components/InstallPrompt";

export default function Login() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const pathname = usePathname(); // ✅ THÊM DÒNG NÀY
  const [form, setForm] = useState({ email: "", password: "", honeypot: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const failedAttempts = useRef(0);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ================= REDIRECT IF LOGGED IN - ĐÃ FIX ================= */
  useEffect(() => {
    let isMounted = true; // ✅ THÊM FLAG CHỐNG RACE CONDITION

    const unsub = onAuthStateChanged(auth, (user) => {
      // ✅ FIX 1: Nếu component unmount rồi thì bỏ qua
      if (!isMounted) return;
      
      // ✅ FIX 2: Chỉ redirect khi đang thực sự ở trang /login
      if (pathname!== '/login') return;

      if (user?.emailVerified) {
        router.replace("/");
      } else if (user &&!user.emailVerified) {
        router.replace("/verify-email");
      }
    });

    return () => {
      isMounted = false; // ✅ CLEANUP
      unsub();
    };
  }, [router, pathname]); // ✅ THÊM pathname VÀO DEPS

  // Cleanup timeout khi unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    };
  }, []);

  const validateField = (field: string, value: string) => {
    if (field === "email") {
      if (!value) return "Vui lòng nhập email";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email không hợp lệ";
    }
    if (field === "password" &&!value) return "Vui lòng nhập mật khẩu";
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
    if (form.honeypot) return; // Bot detected

    // Rate limit: 3 lần/30s
    const lastFail = localStorage.getItem("login_fail_time");
    if (failedAttempts.current >= 3 && lastFail && Date.now() - parseInt(lastFail) < 30000) {
      setErrors({ submit: "Thử quá nhiều lần, đợi 30s" });
      return;
    }

    if (!validate()) return;

    try {
      setLoading(true);
      setErrors({});

      await setPersistence(auth, remember? browserLocalPersistence : browserSessionPersistence);
      const res = await signInWithEmailAndPassword(auth, form.email, form.password);
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
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || "U")}&background=random`,
          shortId: nanoid(6).toUpperCase(),
          online: true,
          lastSeen: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } else {
        const data = snap.data();
        const updates: any = { online: true, lastSeen: serverTimestamp() };
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
        "auth/too-many-requests": "Thử quá nhiều lần, đợi 1 phút",
        "auth/network-request-failed": "Lỗi mạng, kiểm tra kết nối",
        "auth/user-disabled": "Tài khoản đã bị khóa",
        "auth/invalid-email": "Email không hợp lệ",
      };
      setErrors({ submit: errorMap[err.code] || "Đăng nhập thất bại" });
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

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white text-3xl font-bold">A</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">Chào mừng trở lại</h1>
            <p className="text-gray-500 dark:text-zinc-400">Đăng nhập để tiếp tục</p>
          </div>

          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl mb-4 flex items-center gap-2 text-sm">
              <FiAlertCircle size={18} />
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              name="website"
              value={form.honeypot}
              onChange={(e) => setForm({...form, honeypot: e.target.value })}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            <div>
              <div className="flex items-center bg-white dark:bg-zinc-900 rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <FiMail className="mr-3 text-gray-400 dark:text-zinc-500" size={20} />
                <input
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  className="w-full outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                  value={form.email}
                  onChange={(e) => {
                    setForm({...form, email: e.target.value });
                    if (errors.email) setErrors({...errors, email: "" });
                  }}
                  onBlur={() => setErrors({...errors, email: validateField("email", form.email) })}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.email}</p>}
            </div>

            <div>
              <div className="flex items-center bg-white dark:bg-zinc-900 rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <FiLock className="mr-3 text-gray-400 dark:text-zinc-500" size={20} />
                <input
                  type={show? "text" : "password"}
                  placeholder="Mật khẩu"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  className="w-full outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                  value={form.password}
                  onChange={(e) => {
                    setForm({...form, password: e.target.value });
                    if (errors.password) setErrors({...errors, password: "" });
                  }}
                  onBlur={() => setErrors({...errors, password: validateField("password", form.password) })}
                />
                <button type="button" onClick={handleShowPass} className="ml-2 text-gray-400 dark:text-zinc-500" aria-label="Hiện mật khẩu">
                  {show? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500/20" />
                <span className="text-gray-600 dark:text-zinc-400">Ghi nhớ</span>
              </label>
              <Link href="/forgot-password" className="text-blue-500 font-semibold">Quên mật khẩu?</Link>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang đăng nhập...</> : "Đăng nhập"}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-600 dark:text-zinc-400">
            Chưa có tài khoản? <Link href="/register" className="text-blue-500 font-semibold">Đăng ký ngay</Link>
          </p>
        </div>
      </div>
    </>
  );
}
