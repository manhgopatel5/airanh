"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEyeOff, FiEye, FiUser, FiAlertCircle, FiSend, FiSmartphone } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, GoogleAuthProvider, signInWithPopup, getRedirectResult, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, setPersistence, browserLocalPersistence } from "firebase/auth";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";
import loadingPull from "@/public/lotties/huha-loading-pull.json";
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
  const [showSuccess, setShowSuccess] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/chat";

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
if (
  typeof window !== "undefined" &&
  "PublicKeyCredential" in window &&
  typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
) {
  PublicKeyCredential
    .isUserVerifyingPlatformAuthenticatorAvailable()
    .then(setPasskeySupported)
    .catch(() => setPasskeySupported(false));
}
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = localStorage.getItem("emailForSignIn") || window.prompt("Nhập email để xác nhận");
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
         .then(() => { localStorage.removeItem("emailForSignIn"); toast.success("Đăng nhập thành công"); router.replace(redirectTo); })
         .catch(() => setErrors({ submit: "Link không hợp lệ" }));
      }
    }
    getRedirectResult(auth).then((result) => { if (result) { toast.success("Đăng nhập thành công"); router.replace(redirectTo); } }).catch(() => {});
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
      case "password": if (!value) return "Nhập mật khẩu"; if (value.length < 8) return "Tối thiểu 8 ký tự"; if (getPasswordStrength(value) < 3) return "Cần chữ hoa, thường, số, ký tự"; return "";
      case "confirmPassword": if (value!== form.password) return "Không khớp"; return "";
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
    if (!auth) return;
    try {
      setGoogleLoading(true); setErrors({});
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.addScope('email'); provider.addScope('profile'); provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      toast.success("Đăng nhập thành công"); router.replace("/chat");
    } catch (err: any) {
      if (err.code!== "auth/popup-closed-by-user") setErrors({ submit: "Đăng nhập Google thất bại" });
    } finally { setGoogleLoading(false); }
  };

  const handleMagicLink = async () => {
    if (!auth) return;
    if (!form.email ||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErrors({ email: "Email không hợp lệ" });
    try {
      setMagicLoading(true); setErrors({});
      await sendSignInLinkToEmail(auth, form.email, { url: window.location.origin + "/register", handleCodeInApp: true });
      localStorage.setItem("emailForSignIn", form.email);
      setMagicLinkSent(true); toast.success("Đã gửi link");
    } catch { setErrors({ submit: "Gửi link thất bại" }); } finally { setMagicLoading(false); }
  };

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!auth ||!db) return;
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
      setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); router.replace("/verify-email"); }, 1500);
    } catch (err: any) {
      const errorMap: Record<string, string> = { "auth/email-already-in-use": "Email đã dùng", "auth/invalid-email": "Email không hợp lệ", "auth/weak-password": "Mật khẩu yếu", "auth/network-request-failed": "Lỗi mạng", "auth/too-many-requests": "Thử quá nhiều" };
      setErrors({ submit: errorMap[err.code] || "Đăng ký thất bại" });
    } finally { setLoading(false); }
  };

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => { setForm({...form, [field]: e.target.value }); if (errors[field]) setErrors({...errors, [field]: "" }); };
  const handleBlur = (field: string) => { setTouched({...touched, [field]: true }); const err = validateField(field, form[field as keyof typeof form]); if (err) setErrors({...errors, [field]: err }); };

  if (authLoading || (user && userData)) {
    return <div className="h-dvh bg-zinc-50 dark:bg-black flex items-center justify-center"><LottiePlayer animationData={loadingPull} loop autoplay className="w-16 h-16" /></div>;
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-dvh bg-zinc-50 dark:bg-black flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl p-6 border-zinc-200/60 dark:border-zinc-900">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-[#0042B2]/25" style={{background:'linear-gradient(135deg,#0042B2,#1A5FFF)'}}><span className="text-white text-3xl font-black">H</span></div>
              <h1 className="text-2xl font-black tracking-tight mb-1">Tạo tài khoản HUHA</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Tham gia ngay hôm nay</p>
            </div>

            <AnimatePresence>
              {errors.submit && <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-3 py-2.5 rounded-2xl mb-4 flex items-center gap-2 text-sm"><FiAlertCircle size={16} />{errors.submit}</motion.div>}
              {magicLinkSent && <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="bg-[#E8F1FF] dark:bg-[#0042B2]/10 border-[#0042B2]/20 text-[#0042B2] px-3 py-2.5 rounded-2xl mb-4 flex items-center gap-2 text-sm"><FiSend size={16} />Đã gửi link! Kiểm tra email</motion.div>}
            </AnimatePresence>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <input type="text" name="website" value={form.honeypot} onChange={handleChange("honeypot")} className="hidden" tabIndex={-1} autoComplete="off" />

              <div>
                <div className="relative"><FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input ref={nameRef} type="text" placeholder="Họ và tên" autoComplete="name" className={`w-full pl-11 pr-3 h-12 rounded-2xl border-2 text-sm ${touched.name && errors.name? "border-red-500" : "border-zinc-200 dark:border-zinc-800 focus:border-[#0042B2]"} bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-[#0042B2]/20 outline-none transition-all`} value={form.name} onChange={handleChange("name")} onBlur={() => handleBlur("name")} /></div>
                {touched.name && errors.name && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.name}</p>}
              </div>

              <div>
                <div className="relative"><FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input type="email" placeholder="Email" autoComplete="email" className={`w-full pl-11 pr-3 h-12 rounded-2xl border-2 text-sm ${touched.email && errors.email? "border-red-500" : "border-zinc-200 dark:border-zinc-800 focus:border-[#0042B2]"} bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-[#0042B2]/20 outline-none transition-all`} value={form.email} onChange={handleChange("email")} onBlur={() => handleBlur("email")} /></div>
                {touched.email && errors.email && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.email}</p>}
              </div>

              <div>
                <div className="relative"><FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input type={showPass? "text" : "password"} placeholder="Mật khẩu" autoComplete="new-password" className={`w-full pl-11 pr-11 h-12 rounded-2xl border-2 text-sm ${touched.password && errors.password? "border-red-500" : "border-zinc-200 dark:border-zinc-800 focus:border-[#0042B2]"} bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-[#0042B2]/20 outline-none transition-all`} value={form.password} onChange={handleChange("password")} onBlur={() => handleBlur("password")} /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">{showPass? <FiEyeOff size={18} /> : <FiEye size={18} />}</button></div>
              {form.password && <div className="flex gap-1 mt-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < passStrength? passStrength < 2? "bg-red-500" : passStrength < 3? "bg-yellow-500" : "bg-[#00C853]" : "bg-zinc-200 dark:bg-zinc-800"}`} />)}</div>}
                {touched.password && errors.password && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.password}</p>}
              </div>

              <div>
                <div className="relative"><FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input type={showConfirm? "text" : "password"} placeholder="Xác nhận mật khẩu" autoComplete="new-password" className={`w-full pl-11 pr-11 h-12 rounded-2xl border-2 text-sm ${touched.confirmPassword && errors.confirmPassword? "border-red-500" : "border-zinc-200 dark:border-zinc-800 focus:border-[#0042B2]"} bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-[#0042B2]/20 outline-none transition-all`} value={form.confirmPassword} onChange={handleChange("confirmPassword")} onBlur={() => handleBlur("confirmPassword")} /><button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">{showConfirm? <FiEyeOff size={18} /> : <FiEye size={18} />}</button></div>
                {touched.confirmPassword && errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.confirmPassword}</p>}
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-3 cursor-pointer group"><input type="checkbox" checked={acceptTerms} onChange={(e) => { setAcceptTerms(e.target.checked); if (errors.terms) setErrors({...errors, terms: "" }); }} className="mt-0.5 w-4 h-4 rounded border-2 border-zinc-300 focus:ring-2 focus:ring-[#0042B2]/30" style={{accentColor:'#0042B2'}} /><span className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white">Tôi đồng ý với <Link href="/terms" target="_blank" className="font-semibold text-[#0042B2] hover:underline">Điều khoản</Link></span></label>
                {errors.terms && <p className="text-red-500 text-xs ml-7">{errors.terms}</p>}
                <label className="flex items-start gap-3 cursor-pointer group"><input type="checkbox" checked={acceptPrivacy} onChange={(e) => { setAcceptPrivacy(e.target.checked); if (errors.privacy) setErrors({...errors, privacy: "" }); }} className="mt-0.5 w-4 h-4 rounded border-2 border-zinc-300 focus:ring-2 focus:ring-[#0042B2]/30" style={{accentColor:'#0042B2'}} /><span className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white">Tôi đồng ý với <Link href="/privacy" target="_blank" className="font-semibold text-[#0042B2] hover:underline">Chính sách</Link></span></label>
                {errors.privacy && <p className="text-red-500 text-xs ml-7">{errors.privacy}</p>}
              </div>

              <motion.button type="submit" whileTap={{scale:0.98}} disabled={loading || googleLoading || magicLoading ||!auth} className="w-full h-12 rounded-2xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0042B2]/25 mt-2" style={{background:'linear-gradient(135deg,#0042B2,#1A5FFF)'}}>
                {loading? <><LottiePlayer animationData={loadingPull} loop autoplay className="w-5 h-5" />Đang tạo...</> : "Đăng ký HUHA"}
              </motion.button>
            </form>

            <div className="relative my-5"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-zinc-800" /></div><div className="relative flex justify-center text-xs"><span className="bg-white dark:bg-zinc-950 px-3 text-zinc-500">hoặc</span></div></div>

            <div className="space-y-2.5">
              <motion.button whileTap={{scale:0.98}} onClick={handleGoogleSignup} disabled={loading || googleLoading || magicLoading ||!auth} className="w-full h-11 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"><FcGoogle size={20} />{googleLoading? "Đang kết nối..." : "Đăng ký với Google"}</motion.button>
              <motion.button whileTap={{scale:0.98}} onClick={handleMagicLink} disabled={loading || googleLoading || magicLoading ||!auth} className="w-full h-11 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"><FiSend size={18} />{magicLoading? "Đang gửi..." : "Email Link"}</motion.button>
              {passkeySupported && <motion.button whileTap={{scale:0.98}} onClick={()=>toast.info("Passkey đang phát triển")} disabled={loading || googleLoading || magicLoading ||!auth} className="w-full h-11 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"><FiSmartphone size={18} />Face ID</motion.button>}
            </div>

            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mt-5">Đã có tài khoản? <Link href="/login" className="font-bold text-[#0042B2] hover:underline">Đăng nhập</Link></p>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-950 rounded-3xl p-8 shadow-2xl">
              <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-24 h-24 mx-auto" />
              <p className="text-center font-bold mt-3">Đăng ký thành công!</p>
              <p className="text-center text-sm text-zinc-500 mt-1">Kiểm tra email để xác thực</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}