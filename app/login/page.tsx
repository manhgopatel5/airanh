"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiSend, FiSmartphone } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
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
  const searchParams = useSearchParams();
  const authRef = useRef<Auth | null>(null);
  const dbRef = useRef<Firestore | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    honeypot: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);

  const failedAttempts = useRef(0);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTo = searchParams.get("redirect") || "/";

  useEffect(() => {
    authRef.current = getFirebaseAuth();
    dbRef.current = getFirebaseDB();

    // Check passkey support
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(setPasskeySupported);
    }

    // Handle magic link sign-in
    if (isSignInWithEmailLink(authRef.current, window.location.href)) {
      let email = localStorage.getItem("emailForSignIn");
      if (!email) {
        email = window.prompt("Nhập email để xác nhận");
      }
      if (email) {
        signInWithEmailLink(authRef.current, email, window.location.href)
         .then(async (result) => {
            localStorage.removeItem("emailForSignIn");
            await updateUserDoc(result.user, dbRef.current!);
            toast.success("Đăng nhập thành công");
            router.replace(redirectTo);
          })
         .catch(() => setErrors({ submit: "Link không hợp lệ hoặc đã hết hạn" }));
      }
    }

    // Handle Google redirect
    getRedirectResult(authRef.current)
     .then(async (result) => {
        if (result) {
          await updateUserDoc(result.user, dbRef.current!);
          toast.success("Đăng nhập thành công");
          router.replace(redirectTo);
        }
      })
     .catch(() => setErrors({ submit: "Đăng nhập Google thất bại" }));

    // Remember last email
    const lastEmail = localStorage.getItem("last_email");
    if (lastEmail) setForm(prev => ({...prev, email: lastEmail }));

    // Auto redirect nếu đã login
    const unsub = onAuthStateChanged(authRef.current, (user) => {
      if (user && user.emailVerified) {
        router.replace(redirectTo);
      } else {
        setAuthChecking(false);
        setTimeout(() => emailRef.current?.focus(), 100);
      }
    });
    return () => unsub();
  }, [router, redirectTo]);

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

  const updateUserDoc = async (user: any, db: Firestore) => {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef).catch(() => null);

    if (!snap ||!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email?.split("@")[0] || "User",
        avatar:
          user.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            user.email || "U"
          )}&background=0EA5E9`,
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
      if (user.photoURL &&!data.avatar) updates.avatar = user.photoURL;
      if (user.displayName &&!data.name) updates.name = user.displayName;
      await updateDoc(userRef, updates);
    }
  };

  const handleMagicLink = async () => {
    const auth = authRef.current;
    if (!auth) return;
    
    if (!form.email) {
      setErrors({ email: "Nhập email trước" });
      emailRef.current?.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrors({ email: "Email không hợp lệ" });
      return;
    }

    try {
      setMagicLoading(true);
      setErrors({});
      
      await sendSignInLinkToEmail(auth, form.email, {
        url: window.location.origin + "/login",
        handleCodeInApp: true,
      });
      
      localStorage.setItem("emailForSignIn", form.email);
      localStorage.setItem("last_email", form.email);
      setMagicLinkSent(true);
      toast.success("Đã gửi link đăng nhập qua email");
    } catch (err: any) {
      setErrors({ submit: "Gửi link thất bại" });
    } finally {
      setMagicLoading(false);
    }
  };

  const handlePasskey = async () => {
    toast.info("Passkey đang phát triển");
    // WebAuthn implementation sẽ cần backend để verify
    // Tạm thời để placeholder
  };

  const handleGoogleLogin = async () => {
    const auth = authRef.current;
    const db = dbRef.current;

    if (!auth ||!db) {
      toast.error("Firebase chưa sẵn sàng");
      return;
    }

    try {
      setGoogleLoading(true);
      setErrors({});

      await setPersistence(
        auth,
        remember
      ? browserLocalPersistence
          : browserSessionPersistence
      );

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        const res = await signInWithPopup(auth, provider);
        await updateUserDoc(res.user, db);
        localStorage.setItem("last_email", res.user.email || "");
        toast.success("Đăng nhập thành công");
        router.replace(redirectTo);
      }
    } catch (err: any) {
      if (err.code === "auth/popup-blocked") {
        setErrors({ submit: "Popup bị chặn. Cho phép popup và thử lại" });
      } else if (err.code === "auth/popup-closed-by-user") {
        return;
      } else if (err.code === "auth/unauthorized-domain") {
        setErrors({ submit: "Domain chưa được xác thực trên Firebase" });
      } else {
        setErrors({ submit: "Đăng nhập Google thất bại" });
      }
    } finally {
      setGoogleLoading(false);
    }
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

      await updateUserDoc(user, db);
      localStorage.setItem("last_email", form.email);

      failedAttempts.current = 0;
      localStorage.removeItem("login_fail_time");

      toast.success("Đăng nhập thành công");
      router.replace(redirectTo);
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

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="h-8 w-32 bg-white/20 rounded-lg animate-pulse mx-auto" />
          <div className="h-10 w-full bg-white/20 rounded-lg animate-pulse" />
          <div className="h-10 w-full bg-white/20 rounded-lg animate-pulse" />
          <div className="h-12 w-full bg-white/20 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <InstallPrompt />

      <div className="min-h-screen bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6"
          >
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
              Đăng nhập
            </h1>

            {errors.submit && (
              <div className="text-red-500 mb-4 flex items-center gap-2 text-sm bg-red-50 px-3 py-2.5 rounded-lg">
                <FiAlertCircle size={16} /> {errors.submit}
              </div>
            )}

            {magicLinkSent && (
              <div className="bg-sky-50 border border-sky-200 text-sky-700 px-3 py-2.5 rounded-lg mb-4 flex items-center gap-2 text-sm">
                <FiSend size={16} /> Đã gửi link! Kiểm tra email và thư mục Spam
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
                    ref={emailRef}
                    className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm ${
                      errors.email? "border-red-500" : "border-gray-300"
                    } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none transition-all`}
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
                      errors.password? "border-red-500" : "border-gray-300"
                    } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none transition-all`}
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

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
                  />
                  <span className="text-sm text-gray-700">Ghi nhớ</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-sky-600 hover:text-sky-700"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={loading || googleLoading || magicLoading}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-sky-500/30"
              >
                {loading? "Đang đăng nhập..." : "Đăng nhập"}
              </motion.button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-500">hoặc</span>
              </div>
            </div>

            <div className="space-y-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading || magicLoading}
                className="w-full py-3 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <FcGoogle size={20} />
                {googleLoading? "Đang kết nối..." : "Tiếp tục với Google"}
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={handleMagicLink}
                disabled={loading || googleLoading || magicLoading}
                className="w-full py-3 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <FiSend size={18} />
                {magicLoading? "Đang gửi..." : "Đăng nhập bằng Email Link"}
              </motion.button>

              {passkeySupported && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePasskey}
                  disabled={loading || googleLoading || magicLoading}
                  className="w-full py-3 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <FiSmartphone size={18} />
                  Đăng nhập bằng Face ID
                </motion.button>
              )}
            </div>

            <p className="text-center text-sm text-gray-600 mt-4">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="font-semibold text-sky-600 hover:text-sky-700">
                Đăng ký
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}