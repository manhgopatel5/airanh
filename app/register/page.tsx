"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEyeOff, FiEye, FiUser, FiAlertCircle, FiSend, FiSmartphone } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import {
  createUserWithEmailAndPassword, updateProfile, sendEmailVerification,
  GoogleAuthProvider, signInWithPopup, getRedirectResult,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  setPersistence, browserLocalPersistence
} from "firebase/auth";
import { toast, Toaster } from "sonner";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useAuth } from "@/lib/AuthContext";

export default function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData, loading: authLoading } = useAuth();
  
  const [auth, setAuth] = useState<any>(null);
  const [db, setDb] = useState<any>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", honeypot: "" });
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

  const redirectTo = searchParams.get("redirect") || "/chat";
  const loadingLottie = "/lotties/huha-loading-pull-full.lottie";

  useEffect(() => {
    const init = async () => {
      const firebase = await import("@/lib/firebase");
      setAuth(firebase.getFirebaseAuth());
      setDb(firebase.getFirebaseDB());
    };
    init();
  }, []);

  useEffect(() => {
    if (!authLoading && user && userData) router.replace("/chat");
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    if (!auth) return;
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(setPasskeySupported);
    }
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = localStorage.getItem("emailForSignIn");
      if (!email) email = window.prompt("Nhập email để xác nhận");
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => { localStorage.removeItem("emailForSignIn"); toast.success("Đăng nhập thành công"); router.replace(redirectTo); })
          .catch(() => setErrors({ submit: "Link không hợp lệ" }));
      }
    }
    getRedirectResult(auth).then((result) => { if (result) { toast.success("Đăng nhập thành công"); router.replace(redirectTo); } }).catch(() => setErrors({ submit: "Đăng nhập Google thất bại" }));
    setTimeout(() => nameRef.current?.focus(), 100);
  }, [auth, router, redirectTo]);

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };
  const passStrength = getPasswordStrength(form.password);

  const validateField = useCallback((field: string, value: string) => {
    switch (field) {
      case "name": if (!value.trim()) return "Nhập tên"; if (value.length < 2) return "Tên quá ngắn"; return "";
      case "email": if (!value) return "Nhập email"; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email không hợp lệ"; return "";
      case "password": if (!value) return "Nhập mật khẩu"; if (value.length < 8) return "Tối thiểu 8 ký tự"; if (getPasswordStrength(value) < 3) return "Cần chữ hoa, thường, số, ký tự đặc biệt"; return "";
      case "confirmPassword": if (value !== form.password) return "Không khớp"; return "";
      default: return "";
    }
  }, [form.password]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    Object.keys(form).forEach((key) => { if (key === "honeypot") return; const err = validateField(key, form[key as keyof typeof form]); if (err) newErrors[key] = err; });
    if (!acceptTerms) newErrors.terms = "Đồng ý điều khoản";
    if (!acceptPrivacy) newErrors.privacy = "Đồng ý chính sách";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, acceptTerms, acceptPrivacy, validateField]);

  const handleGoogleSignup = async () => {
    if (!auth) return setErrors({ submit: "Firebase chưa sẵn sàng" });
    try {
      setGoogleLoading(true); setErrors({});
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.addScope('email'); provider.addScope('profile'); provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      toast.success("Đăng nhập thành công"); router.replace("/chat");
    } catch (err: any) {
      if (err.code === "auth/popup-blocked") setErrors({ submit: "Popup bị chặn" });
      else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") setErrors({ submit: `Lỗi: ${err.code}` });
    } finally { setGoogleLoading(false); }
  };

  const handleMagicLink = async () => {
    if (!auth) return;
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErrors({ email: "Email không hợp lệ" });
    try {
      setMagicLoading(true); setErrors({});
      await sendSignInLinkToEmail(auth, form.email, { url: window.location.origin + "/register", handleCodeInApp: true });
      localStorage.setItem("emailForSignIn", form.email);
      setMagicLinkSent(true); toast.success("Đã gửi link");
    } catch { setErrors({ submit: "Gửi link thất bại" }); } finally { setMagicLoading(false); }
  };

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!auth || !db) return;
    if (form.honeypot) return;
    const lastAttempt = localStorage.getItem("last_register_attempt");
    if (lastAttempt && Date.now() - parseInt(lastAttempt, 10) < 60000) return setErrors({ submit: "Chờ 1 phút" });
    if (!validate()) return;
    setLoading(true); setErrors({}); localStorage.setItem("last_register_attempt", Date.now().toString());
    try {
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(userCred.user, { displayName: form.name });
      await sendEmailVerification(userCred.user);
      localStorage.setItem("last_email", form.email);
      toast.success("Đăng ký thành công! Kiểm tra email");
      router.replace("/verify-email");
    } catch (err: any) {
      const errorMap: Record<string, string> = { "auth/email-already-in-use": "Email đã dùng", "auth/invalid-email": "Email không hợp lệ", "auth/weak-password": "Mật khẩu yếu", "auth/network-request-failed": "Lỗi mạng", "auth/too-many-requests": "Thử quá nhiều" };
      setErrors({ submit: errorMap[err.code] || "Đăng ký thất bại" });
    } finally { setLoading(false); }
  };

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => { setForm({...form, [field]: e.target.value }); if (errors[field]) setErrors({...errors, [field]: "" }); };
  const handleBlur = (field: string) => { setTouched({...touched, [field]: true }); const err = validateField(field, form[field as keyof typeof form]); if (err) setErrors({...errors, [field]: err }); };

  if (authLoading || (user && userData)) {
    return <div className="h-dvh bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center"><div className="w-16 h-16"><DotLottieReact src={loadingLottie} autoplay loop /></div></div>;
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-dvh bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 border border-white/20">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg" style={{background:'linear-gradient(135deg,#0042B2,#1A5FFF)'}}><span className="text-white text-3xl font-black">H</span></div>
              <h1 className="text-2xl font-bold text-zinc-900 mb-1.5">Tạo tài khoản HUHA</h1>
              <p className="text-sm text-zinc-600">Tham gia ngay hôm nay</p>
            </div>

            {errors.submit && <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="bg-red-50 border-red-200 text-red-600 px-3 py-2.5 rounded-xl mb-4 flex items-center gap-2 text-sm"><FiAlertCircle size={16} />{errors.submit}</motion.div>}
            {magicLinkSent && <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="bg-[#E8F1FF] border border-[#0042B2]/20 text-[#0042B2] px-3 py-2.5 rounded-xl mb-4 flex items-center gap-2 text-sm"><FiSend size={16} />Đã gửi link! Kiểm tra email</motion.div>}

            <form onSubmit={handleRegister} className="space-y-4">
              <input type="text" name="website" value={form.honeypot} onChange={handleChange("honeypot")} className="hidden" tabIndex={-1} autoComplete="off" />
              
              <div>
                <div className="relative"><FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input ref={nameRef} type="text" placeholder="Họ và tên" autoComplete="name" className={`w-full pl-10 pr-3 h-11 rounded-xl border text-sm ${touched.name && errors.name ? "border-red-500" : "border-zinc-300 dark:border-zinc-800"} bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none`} value={form.name} onChange={handleChange("name")} onBlur={() => handleBlur("name")} /></div>
                {touched.name && errors.name && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.name}</p>}
              </div>

              <div>
                <div className="relative"><FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input type="email" placeholder="Email" autoComplete="email" className={`w-full pl-10 pr-3 h-11 rounded-xl border text-sm ${touched.email && errors.email ? "border-red-500" : "border-zinc-300 dark:border-zinc-800"} bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none`} value={form.email} onChange={handleChange("email")} onBlur={() => handleBlur("email")} /></div>
                {touched.email && errors.email && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.email}</p>}
              </div>

              <div>
                <div className="relative"><FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input type={showPass ? "text" : "password"} placeholder="Mật khẩu" autoComplete="new-password" className={`w-full pl-10 pr-10 h-11 rounded-xl border text-sm ${touched.password && errors.password ? "border-red-500" : "border-zinc-300 dark:border-zinc-800"} bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none`} value={form.password} onChange={handleChange("password")} onBlur={() => handleBlur("password")} /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">{showPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}</button></div>
                {form.password && <div className="flex gap-1 mt-2 ml-1">{Array.from({ length: 4 }).map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i < passStrength ? passStrength < 2 ? "bg-red-500" : passStrength < 3 ? "bg-yellow-500" : "bg-green-500" : "bg-zinc-200"}`} />)}</div>}
                {touched.password && errors.password && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.password}</p>}
              </div>

              <div>
                <div className="relative"><FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input type={showConfirm ? "text" : "password"} placeholder="Xác nhận mật khẩu" autoComplete="new-password" className={`w-full pl-10 pr-10 h-11 rounded-xl border text-sm ${touched.confirmPassword && errors.confirmPassword ? "border-red-500" : "border-zinc-300 dark:border-zinc-800"} bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none`} value={form.confirmPassword} onChange={handleChange("confirmPassword")} onBlur={() => handleBlur("confirmPassword")} /><button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">{showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}</button></div>
                {touched.confirmPassword && errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.confirmPassword}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3"><input type="checkbox" id="terms" checked={acceptTerms} onChange={(e) => { setAcceptTerms(e.target.checked); if (errors.terms) setErrors({...errors, terms: "" }); }} className="mt-0.5 w-4 h-4 rounded focus:ring-2 cursor-pointer" style={{accentColor:'#0042B2'}} /><label htmlFor="terms" className="text-sm text-zinc-600 cursor-pointer">Tôi đồng ý với <Link href="/terms" target="_blank" className="font-semibold hover:underline" style={{color:'#0042B2'}}>Điều khoản</Link></label></div>
                {errors.terms && <p className="text-red-500 text-xs">{errors.terms}</p>}
                <div className="flex items-start gap-3"><input type="checkbox" id="privacy" checked={acceptPrivacy} onChange={(e) => { setAcceptPrivacy(e.target.checked); if (errors.privacy) setErrors({...errors, privacy: "" }); }} className="mt-0.5 w-4 h-4 rounded focus:ring-2 cursor-pointer" style={{accentColor:'#0042B2'}} /><label htmlFor="privacy" className="text-sm text-zinc-600 cursor-pointer">Tôi đồng ý với <Link href="/privacy" target="_blank" className="font-semibold hover:underline" style={{color:'#0042B2'}}>Chính sách</Link></label></div>
                {errors.privacy && <p className="text-red-500 text-xs">{errors.privacy}</p>}
              </div>

              <motion.button type="submit" whileTap={{scale:0.98}} disabled={loading || googleLoading || magicLoading || !auth} className="w-full h-12 rounded-xl text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg" style={{background:'linear-gradient(135deg,#0042B2,#1A5FFF)',boxShadow:'0 8px 20px rgba(0,66,178,0.3)'}}>
                {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang tạo...</> : "Đăng ký HUHA"}
              </motion.button>
            </form>

            <div className="relative my-5"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-300" /></div><div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-zinc-500">hoặc</span></div></div>

            <div className="space-y-3">
              <motion.button whileTap={{scale:0.98}} onClick={handleGoogleSignup} disabled={loading || googleLoading || magicLoading || !auth} className="w-full h-11 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-50 disabled:opacity-50 flex items-center justify-center gap-2"><FcGoogle size={20} />{googleLoading ? "Đang kết nối..." : "Đăng ký với Google"}</motion.button>
              <motion.button whileTap={{scale:0.98}} onClick={handleMagicLink} disabled={loading || googleLoading || magicLoading || !auth} className="w-full h-11 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-50 disabled:opacity-50 flex items-center justify-center gap-2"><FiSend size={18} />{magicLoading ? "Đang gửi..." : "Email Link"}</motion.button>
              {passkeySupported && <motion.button whileTap={{scale:0.98}} onClick={()=>toast.info("Passkey đang phát triển")} disabled={loading || googleLoading || magicLoading || !auth} className="w-full h-11 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-50 disabled:opacity-50 flex items-center justify-center gap-2"><FiSmartphone size={18} />Face ID</motion.button>}
            </div>

            <p className="text-center text-sm text-zinc-600 mt-4">Đã có tài khoản? <Link href="/login" className="font-semibold hover:underline" style={{color:'#0042B2'}}>Đăng nhập</Link></p>
          </motion.div>
        </div>
      </div>
    </>
  );
}