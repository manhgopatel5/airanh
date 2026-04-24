"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [form, setForm] = useState({ email: "", password: "", honeypot: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const failedAttempts = useRef(0);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ================= KHÓA SCROLL ================= */
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const originalHeight = document.body.style.height;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";

    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("touchmove", preventDefault, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overflow = "";
      document.removeEventListener("touchmove", preventDefault);
    };
  }, []);

  /* ================= REDIRECT IF LOGGED IN ================= */
  useEffect(() => {
    let isMounted = true;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!isMounted) return;
      if (pathname!== "/login") return;

      if (user?.emailVerified) {
        router.replace("/");
      } else if (user &&!user.emailVerified) {
        router.replace("/verify-email");
      }
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, [router, pathname]);

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
    if (form.honeypot) return;

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

      {/* BACKGROUND */}
      <div className="h-screen w-screen fixed inset-0 bg-gradient-to-br from-[#E8F1FF] via-[#F0F7FF] to-[#F8FBFF] dark:from-[#0A0A0F] dark:via-[#0F0F1A] dark:to-[#14141F]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-40" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
      </div>

      <div className="h-screen w-screen flex items-center justify-center px-5 font-sans relative z-10">
        <div className="w-full max-w-[400px]">
          {/* LOGO */}
          <div className="text-center mb-10">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl blur-2xl opacity-50" />
              <div className="relative w-full h-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 ring-1 ring-white/30">
                <span className="text-white text-5xl font-black tracking-tighter">A</span>
              </div>
            </div>
            <h1 className="text-[32px] font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              Chào mừng trở lại
            </h1>
            <p className="text-[15px] text-gray-500 dark:text-zinc-400 font-medium">
              Đăng nhập để tiếp tục hành trình
            </p>
          </div>

          {/* ERROR */}
          {errors.submit && (
            <div className="bg-red-500/10 dark:bg-red-500/20 backdrop-blur-xl border border-red-500/20 dark:border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3.5 rounded-2xl mb-5 flex items-center gap-3 text-[15px] font-medium animate-in fade-in slide-in-from-top-2 duration-300">
              <FiAlertCircle size={20} className="flex-shrink-0" />
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

            {/* EMAIL - BỎ VIỀN ĐEN TRONG */}
            <div>
              <div className={`group relative flex items-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl px-4 h-14 shadow-xl shadow-gray-900/5 dark:shadow-black/30 border-2 transition-all duration-300 ${errors.email? 'border-red-400 dark:border-red-500' : 'border-white/60 dark:border-zinc-800/60 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:shadow-blue-500/20'}`}>
                <FiMail className={`mr-3.5 flex-shrink-0 transition-colors ${errors.email? 'text-red-500' : 'text-gray-400 dark:text-zinc-500 group-focus-within:text-blue-500'}`} size={22} />
                <input
                  type="email"
                  placeholder="Email của bạn"
                  autoComplete="email"
                  className="w-full outline-none bg-transparent text-[16px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 font-medium border-none focus:ring-0"
                  value={form.email}
                  onChange={(e) => {
                    setForm({...form, email: e.target.value });
                    if (errors.email) setErrors({...errors, email: "" });
                  }}
                  onBlur={() => setErrors({...errors, email: validateField("email", form.email) })}
                />
              </div>
              {errors.email && <p className="text-red-500 text-[13px] mt-2 ml-1 font-medium animate-in fade-in slide-in-from-top-1">{errors.email}</p>}
            </div>

            {/* PASSWORD - NÚT CON MẮT NẰM TRONG Ô */}
            <div>
              <div className={`group relative flex items-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-2xl px-4 h-14 shadow-xl shadow-gray-900/5 dark:shadow-black/30 border-2 transition-all duration-300 ${errors.password? 'border-red-400 dark:border-red-500' : 'border-white/60 dark:border-zinc-800/60 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:shadow-blue-500/20'}`}>
                <FiLock className={`mr-3.5 flex-shrink-0 transition-colors ${errors.password? 'text-red-500' : 'text-gray-400 dark:text-zinc-500 group-focus-within:text-blue-500'}`} size={22} />
                <input
                  type={show? "text" : "password"}
                  placeholder="Mật khẩu"
                  autoComplete="current-password"
                  className="w-full outline-none bg-transparent text-[16px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 font-medium border-none focus:ring-0 pr-2"
                  value={form.password}
                  onChange={(e) => {
                    setForm({...form, password: e.target.value });
                    if (errors.password) setErrors({...errors, password: "" });
                  }}
                  onBlur={() => setErrors({...errors, password: validateField("password", form.password) })}
                />
                <button
                  type="button"
                  onClick={handleShowPass}
                  className="ml-2 text-gray-400 dark:text-zinc-500 hover:text-blue-500 active:scale-90 transition-all flex-shrink-0"
                >
                  {show? <FiEyeOff size={22} /> : <FiEye size={22} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-[13px] mt-2 ml-1 font-medium animate-in fade-in slide-in-from-top-1">{errors.password}</p>}
            </div>

            {/* REMEMBER + FORGOT */}
            <div className="flex items-center justify-between text-[15px] pt-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-5 h-5 text-blue-500 rounded-md border-2 border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-0 transition-all cursor-pointer"
                />
                <span className="text-gray-600 dark:text-zinc-400 font-medium group-hover:text-gray-900 dark:group-hover:text-zinc-200 transition-colors">Ghi nhớ đăng nhập</span>
              </label>
              <Link href="/forgot-password" className="text-blue-600 dark:text-blue-500 font-bold hover:text-blue-700 dark:hover:text-blue-400 active:opacity-70 transition-all">
                Quên mật khẩu?
              </Link>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full h-14 rounded-2xl text-white text-[17px] font-bold bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mt-7 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center gap-2.5">
                {loading? (
                  <>
                    <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </div>
            </button>
          </form>

          {/* REGISTER */}
          <p className="text-center mt-8 text-[15px] text-gray-600 dark:text-zinc-400 font-medium">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-blue-600 dark:text-blue-500 font-bold hover:text-blue-700 dark:hover:text-blue-400 active:opacity-70 transition-all">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}