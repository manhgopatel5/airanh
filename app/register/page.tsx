"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEyeOff, FiEye, FiUser, FiAlertCircle, FiSend, FiSmartphone } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  getAdditionalUserInfo
} from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { nanoid } from "nanoid";
import { toast, Toaster } from "sonner";
import InstallPrompt from "@/components/InstallPrompt";
import { motion } from "framer-motion";

export default function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authRef = useRef(getFirebaseAuth());
  const dbRef = useRef(getFirebaseDB());
  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    honeypot: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const redirectTo = searchParams.get("redirect") || "/";

  useEffect(() => {
    // Check passkey
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(setPasskeySupported);
    }

    // Handle magic link
    if (isSignInWithEmailLink(authRef.current, window.location.href)) {
      let email = localStorage.getItem("emailForSignIn");
      if (!email) email = window.prompt("Nhập email để xác nhận");
      if (email) {
        signInWithEmailLink(authRef.current, email, window.location.href)
        .then(async (result) => {
            localStorage.removeItem("emailForSignIn");
            await updateUserDoc(result.user, true);
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
          const info = getAdditionalUserInfo(result);
          await updateUserDoc(result.user, info?.isNewUser);
          if (info?.isNewUser) {
            toast.success("Chào mừng bạn đến Airanh!");
            router.replace("/onboarding");
          } else {
            toast.success("Đăng nhập thành công");
            router.replace(redirectTo);
          }
        }
      })
    .catch(() => setErrors({ submit: "Đăng nhập Google thất bại" }));

    // Auto redirect nếu đã login
    const unsub = onAuthStateChanged(authRef.current, (user) => {
      if (user && user.emailVerified) {
        router.replace(redirectTo);
      } else {
        setAuthChecking(false);
        setTimeout(() => nameRef.current?.focus(), 100);
      }
    });
    return () => unsub();
  }, [router, redirectTo]);

  /* ================= PASSWORD STRENGTH ================= */
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const passStrength = getPasswordStrength(form.password);

  /* ================= VALIDATE ================= */
  const validateField = useCallback((field: string, value: string) => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Vui lòng nhập tên";
        if (value.length < 2) return "Tên quá ngắn";
        return "";
      case "email":
        if (!value) return "Vui lòng nhập email";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email không hợp lệ";
        return "";
      case "password":
        if (!value) return "Vui lòng nhập mật khẩu";
        if (value.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
        if (getPasswordStrength(value) < 3) return "Cần chữ hoa, thường, số và ký tự đặc biệt";
        return "";
      case "confirmPassword":
        if (value!== form.password) return "Mật khẩu không khớp";
        return "";
      default:
        return "";
    }
  }, [form.password]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    Object.keys(form).forEach((key) => {
      if (key === "honeypot") return;
      const err = validateField(key, form[key as keyof typeof form]);
      if (err) newErrors[key] = err;
    });
    if (!acceptTerms) newErrors.terms = "Vui lòng đồng ý điều khoản";
    if (!acceptPrivacy) newErrors.privacy = "Vui lòng đồng ý chính sách";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, acceptTerms, acceptPrivacy, validateField]);

  /* ================= UPDATE USER DOC ================= */
  const updateUserDoc = async (user: any, isNewUser = false) => {
    const userRef = doc(dbRef.current, "users", user.uid);
    const snap = await getDoc(userRef).catch(() => null);

    if (!snap ||!snap.exists() || isNewUser) {
      let userId = `AIR${nanoid(6).toUpperCase()}`;
      let attempts = 0;
      while (attempts < 3) {
        const checkSnap = await getDoc(doc(dbRef.current, "usernames", userId));
        if (!checkSnap.exists()) break;
        userId = `AIR${nanoid(6).toUpperCase()}`;
        attempts++;
      }

      await Promise.all([
        setDoc(userRef, {
          email: user.email,
          name: user.displayName || form.name || user.email?.split("@")[0],
          userId,
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || form.name)}&background=0EA5E9`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          emailVerified: user.emailVerified,
          provider: user.providerData[0]?.providerId || "password",
        }),
        setDoc(doc(dbRef.current, "usernames", userId), { uid: user.uid }),
      ]);
    }
  };

  /* ================= GOOGLE SIGN UP ================= */
  const handleGoogleSignup = async () => {
    try {
      setGoogleLoading(true);
      setErrors({});

      await setPersistence(authRef.current, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

      if (isMobile) {
        await signInWithRedirect(authRef.current, provider);
      } else {
        const res = await signInWithPopup(authRef.current, provider);
        const info = getAdditionalUserInfo(res);
        await updateUserDoc(res.user, info?.isNewUser);
        localStorage.setItem("last_email", res.user.email || "");

        if (info?.isNewUser) {
          toast.success("Chào mừng bạn đến Airanh!");
          router.replace("/onboarding");
        } else {
          toast.success("Đăng nhập thành công");
          router.replace(redirectTo);
        }
      }
    } catch (err: any) {
      if (err.code === "auth/popup-blocked") {
        setErrors({ submit: "Popup bị chặn. Cho phép popup và thử lại" });
      } else if (err.code === "auth/popup-closed-by-user") {
        return;
      } else {
        setErrors({ submit: "Đăng ký Google thất bại" });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ================= MAGIC LINK ================= */
  const handleMagicLink = async () => {
    if (!form.email) {
      setErrors({ email: "Nhập email trước" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrors({ email: "Email không hợp lệ" });
      return;
    }

    try {
      setMagicLoading(true);
      setErrors({});

      await sendSignInLinkToEmail(authRef.current, form.email, {
        url: window.location.origin + "/register",
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
    toast.info("Passkey đang phát triển. Dùng Google hoặc Email trước nhé");
  };

  /* ================= EMAIL/PASSWORD REGISTER ================= */
  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (form.honeypot) return; // Bot detected

    // Rate limit 60s
    const lastAttempt = localStorage.getItem("last_register_attempt");
    if (lastAttempt && Date.now() - parseInt(lastAttempt, 10) < 60000) {
      setErrors({ submit: "Vui lòng chờ 1 phút trước khi thử lại" });
      return;
    }

    if (!validate()) return;

    setLoading(true);
    setErrors({});
    localStorage.setItem("last_register_attempt", Date.now().toString());

    try {
      const userCred = await createUserWithEmailAndPassword(authRef.current, form.email, form.password);
      const user = userCred.user;

      await updateProfile(user, { displayName: form.name });
      await updateUserDoc(user, true);
      await sendEmailVerification(user);

      localStorage.setItem("last_email", form.email);

      // Analytics
      if (typeof window!== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "sign_up", { method: "email" });
      }

      toast.success("Đăng ký thành công! Kiểm tra email để xác thực");
      router.replace("/verify-email");
    } catch (err: any) {
      const errorMap: Record<string, string> = {
        "auth/email-already-in-use": "Email đã được sử dụng",
        "auth/invalid-email": "Email không hợp lệ",
        "auth/weak-password": "Mật khẩu quá yếu",
        "auth/network-request-failed": "Lỗi mạng, thử lại sau",
        "auth/too-many-requests": "Thử quá nhiều lần, thử lại sau",
      };
      setErrors({ submit: errorMap[err.code] || "Đăng ký thất bại, thử lại sau" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({...form, [field]: e.target.value });
    if (errors[field]) setErrors({...errors, [field]: "" });
  };

  const handleBlur = (field: string) => {
    setTouched({...touched, [field]: true });
    const err = validateField(field, form[field as keyof typeof form]);
    if (err) setErrors({...errors, [field]: err });
  };

  if (authChecking) {
    return (
      <div className="h-dvh bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center px-4">
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

      <div className="h-dvh bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-sm my-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-sky-500 to-sky-600 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-sky-500/30">
                <span className="text-white text-3xl font-bold">A</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Tạo tài khoản</h1>
              <p className="text-sm text-gray-600">Tham gia Airanh ngay hôm nay</p>
            </div>

            {errors.submit && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 px-3 py-2.5 rounded-lg mb-4 flex items-center gap-2 text-sm"
              >
                <FiAlertCircle size={16} />
                {errors.submit}
              </motion.div>
            )}

            {magicLinkSent && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-sky-50 border border-sky-200 text-sky-700 px-3 py-2.5 rounded-lg mb-4 flex items-center gap-2 text-sm"
              >
                <FiSend size={16} /> Đã gửi link! Kiểm tra email và thư mục Spam
              </motion.div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {/* HONEYPOT */}
              <input type="text" name="website" value={form.honeypot} onChange={handleChange("honeypot")} className="hidden" tabIndex={-1} autoComplete="off" />

              {/* NAME */}
              <div>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    ref={nameRef}
                    type="text"
                    placeholder="Họ và tên"
                    autoComplete="name"
                    className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm ${
                      touched.name && errors.name? "border-red-500" : "border-gray-300"
                    } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none transition-all`}
                    value={form.name}
                    onChange={handleChange("name")}
                    onBlur={() => handleBlur("name")}
                  />
                </div>
                {touched.name && errors.name && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.name}</p>}
              </div>

              {/* EMAIL */}
              <div>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm ${
                      touched.email && errors.email? "border-red-500" : "border-gray-300"
                    } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none transition-all`}
                    value={form.email}
                    onChange={handleChange("email")}
                    onBlur={() => handleBlur("email")}
                  />
                </div>
                {touched.email && errors.email && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.email}</p>}
              </div>

              {/* PASSWORD */}
              <div>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showPass? "text" : "password"}
                    placeholder="Mật khẩu"
                    autoComplete="new-password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm ${
                      touched.password && errors.password? "border-red-500" : "border-gray-300"
                    } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none transition-all`}
                    value={form.password}
                    onChange={handleChange("password")}
                    onBlur={() => handleBlur("password")}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {form.password && (
                  <div className="flex gap-1 mt-2 ml-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${i < passStrength? passStrength < 2? "bg-red-500" : passStrength < 3? "bg-yellow-500" : "bg-green-500" : "bg-gray-200"}`} />
                    ))}
                  </div>
                )}
                {touched.password && errors.password && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.password}</p>}
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showConfirm? "text" : "password"}
                    placeholder="Xác nhận mật khẩu"
                    autoComplete="new-password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm ${
                      touched.confirmPassword && errors.confirmPassword? "border-red-500" : "border-gray-300"
                    } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none transition-all`}
                    value={form.confirmPassword}
                    onChange={handleChange("confirmPassword")}
                    onBlur={() => handleBlur("confirmPassword")}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.confirmPassword}</p>}
              </div>

              {/* TERMS + PRIVACY - FIXED */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="terms"
                    checked={acceptTerms} 
                    onChange={(e) => { setAcceptTerms(e.target.checked); if (errors.terms) setErrors({...errors, terms: "" }); }} 
                    className="mt-0.5 w-4 h-4 text-sky-500 rounded focus:ring-2 focus:ring-sky-400/20 cursor-pointer" 
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                    Tôi đồng ý với{" "}
                    <Link 
                      href="/terms" 
                      target="_blank" 
                      onClick={(e) => e.stopPropagation()}
                      className="text-sky-600 font-semibold hover:text-sky-700 underline"
                    >
                      Điều khoản
                    </Link>
                  </label>
                </div>
                {errors.terms && <p className="text-red-500 text-xs">{errors.terms}</p>}
                
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="privacy"
                    checked={acceptPrivacy} 
                    onChange={(e) => { setAcceptPrivacy(e.target.checked); if (errors.privacy) setErrors({...errors, privacy: "" }); }} 
                    className="mt-0.5 w-4 h-4 text-sky-500 rounded focus:ring-2 focus:ring-sky-400/20 cursor-pointer" 
                  />
                  <label htmlFor="privacy" className="text-sm text-gray-600 cursor-pointer">
                    Tôi đồng ý với{" "}
                    <Link 
                      href="/privacy" 
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sky-600 font-semibold hover:text-sky-700 underline"
                    >
                      Chính sách bảo mật
                    </Link>
                  </label>
                </div>
                {errors.privacy && <p className="text-red-500 text-xs">{errors.privacy}</p>}
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={loading || googleLoading || magicLoading}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2"
              >
                {loading? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang tạo tài khoản...</> : "Đăng ký"}
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
                onClick={handleGoogleSignup}
                disabled={loading || googleLoading || magicLoading}
                className="w-full py-3 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <FcGoogle size={20} />
                {googleLoading? "Đang kết nối..." : "Đăng ký với Google"}
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={handleMagicLink}
                disabled={loading || googleLoading || magicLoading}
                className="w-full py-3 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <FiSend size={18} />
                {magicLoading? "Đang gửi..." : "Đăng ký bằng Email Link"}
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
                  Đăng ký bằng Face ID
                </motion.button>
              )}
            </div>

            <p className="text-center text-sm text-gray-600 mt-4">
              Đã có tài khoản?{" "}
              <Link href="/login" className="text-sky-600 font-semibold hover:text-sky-700">
                Đăng nhập
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}