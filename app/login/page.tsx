"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiSend, FiSmartphone } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { signInWithEmailAndPassword, User, setPersistence, browserLocalPersistence, browserSessionPersistence, sendEmailVerification, GoogleAuthProvider, signInWithPopup, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged, Auth } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, Firestore, runTransaction } from "firebase/firestore";
import { nanoid } from "nanoid";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authRef = useRef<Auth | null>(null);
  const dbRef = useRef<Firestore | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ email: "", password: "", honeypot: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);

  const failedAttempts = useRef(0);
  const redirectTo = searchParams.get("redirect") || "/chat";

  useEffect(() => {
    authRef.current = getFirebaseAuth();
    dbRef.current = getFirebaseDB();

    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().then(setPasskeySupported);
    }

    // Magic link handling
    if (isSignInWithEmailLink(authRef.current, window.location.href)) {
      let email = localStorage.getItem("emailForSignIn") || window.prompt("Nhập email để xác nhận");
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

    const lastEmail = localStorage.getItem("last_email");
    if (lastEmail) setForm(prev => ({...prev, email: lastEmail }));

    const unsub = onAuthStateChanged(authRef.current, (user) => {
      if (user?.emailVerified) router.replace(redirectTo);
      else { setAuthChecking(false); setTimeout(() => emailRef.current?.focus(), 100); }
    });
    return () => unsub();
  }, [router, redirectTo]);

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
    (["email", "password"] as const).forEach(key => {
      const err = validateField(key, form[key]);
      if (err) newErrors[key] = err;
    });
    setErrors(newErrors);
   return Object.keys(newErrors).length === 0;
  };

const updateUserDoc = async (user: User, db: Firestore) => {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef).catch(() => null);
    if (!snap?.exists()) {
      await runTransaction(db, async (tx) => {
        let userId = "";
        for (let i = 0; i < 5; i++) {
          userId = `HUHA${nanoid(6).toUpperCase()}`;
          if (!(await tx.get(doc(db, "userIds", userId))).exists()) break;
        }
        const email = user.email || "";
        const name = user.displayName || email.split("@")[0] || "User";
        let baseUsername = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") || "user";
        let username = baseUsername; let counter = 1;
        while ((await tx.get(doc(db, "usernames", username))).exists() && counter < 100) {
          username = `${baseUsername}${counter++}`;
        }
        tx.set(userRef, {
          uid: user.uid, nameLower: name.toLowerCase(), username, userId,
          email, emailVerified: user.emailVerified,
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=0042B2&color=fff`,
          isOnline: true, lastSeen: serverTimestamp(), createdAt: serverTimestamp(),
          status: "active", searchKeywords: [name.toLowerCase(), userId.toLowerCase(), username.toLowerCase()]
        });
        tx.set(doc(db, "userIds", userId), { uid: user.uid });
        tx.set(doc(db, "usernames", username), { uid: user.uid });
      });
    } else {
     await updateDoc(userRef, {
  isOnline: true,
  lastSeen: serverTimestamp(),
});
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (form.honeypot || !validate()) return;

    const auth = authRef.current; const db = dbRef.current;
    if (!auth || !db) return;

    const lastFail = localStorage.getItem("login_fail_time");
    if (failedAttempts.current >= 3 && lastFail && Date.now() - parseInt(lastFail) < 30000) {
      return setErrors({ submit: "Thử quá nhiều lần, đợi 30s" });
    }

    try {
      setLoading(true); setErrors({});
      await setPersistence(auth, remember? browserLocalPersistence : browserSessionPersistence);
      const res = await signInWithEmailAndPassword(auth, form.email, form.password);

      if (!res.user.emailVerified) {
        toast.warning("Vui lòng xác thực email");
        await sendEmailVerification(res.user).catch(() => {});
        router.replace("/verify-email");
        return;
      }

      await updateUserDoc(res.user, db);
      localStorage.setItem("last_email", form.email);
      failedAttempts.current = 0;
      toast.success("Đăng nhập thành công");
      navigator.vibrate?.(8);
      router.replace(redirectTo);
    } catch (err: any) {
      failedAttempts.current++;
      localStorage.setItem("login_fail_time", Date.now().toString());
      const errorMap: Record<string, string> = {
        "auth/invalid-credential": "Email hoặc mật khẩu không đúng",
        "auth/user-not-found": "Tài khoản không tồn tại",
        "auth/wrong-password": "Mật khẩu không đúng",
        "auth/too-many-requests": "Thử quá nhiều lần",
        "auth/network-request-failed": "Lỗi mạng"
      };
      setErrors({ submit: errorMap[err.code] || "Đăng nhập thất bại" });
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    const auth = authRef.current; const db = dbRef.current;
    if (!auth || !db) return;
    try {
      setGoogleLoading(true);
      await setPersistence(auth, remember? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const res = await signInWithPopup(auth, provider);
      await updateUserDoc(res.user, db);
      localStorage.setItem("last_email", res.user.email || "");
      toast.success("Đăng nhập thành công");
      navigator.vibrate?.(8);
      router.replace(redirectTo);
    } catch (err: any) {
      if (err.code!== "auth/popup-closed-by-user") {
        setErrors({ submit: "Đăng nhập Google thất bại" });
      }
    } finally { setGoogleLoading(false); }
  };

  const handleMagicLink = async () => {
    const auth = authRef.current;
    if (
  !auth ||
  !form.email ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
) {
      return setErrors({ email: "Nhập email hợp lệ trước" });
    }
    try {
      setMagicLoading(true);
      await sendSignInLinkToEmail(auth, form.email, {
        url: window.location.origin + "/login",
        handleCodeInApp: true
      });
      localStorage.setItem("emailForSignIn", form.email);
      localStorage.setItem("last_email", form.email);
      setMagicLinkSent(true);
      toast.success("Đã gửi link đăng nhập");
    } catch {
      setErrors({ submit: "Gửi link thất bại" });
    } finally { setMagicLoading(false); }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <LottiePlayer
  animationData={loadingPull}
  loop
  autoplay
  aria-label="Loading"
  className="w-20 h-20"
/>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-950 rounded-3xl shadow-xl p-6 border-zinc-200/60 dark:border-zinc-800">
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center shadow-lg shadow-[#0042B2]/25">
                <span className="text-white text-3xl font-black">H</span>
              </motion.div>
              <h1 className="text-2xl font-black tracking-tight">Đăng nhập HUHA</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Chào mừng trở lại</p>
            </div>

            {/* Alerts */}
            <AnimatePresence>
              {errors.submit && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 flex items-center gap-2.5">
                  <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">{errors.submit}</p>
                </motion.div>
              )}
              {magicLinkSent && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-2xl bg-[#E8F1FF] dark:bg-[#0042B2]/10 border-[#0042B2]/20 flex items-center gap-2.5">
                  <FiSend className="w-4 h-4 text-[#0042B2] flex-shrink-0" />
                  <p className="text-sm text-[#0042B2] font-medium">Đã gửi link! Kiểm tra email</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-3.5">
              <input type="text" className="hidden" value={form.honeypot} onChange={(e) => setForm({...form, honeypot: e.target.value})} />

              <div>
                <div className="relative group">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 group-focus-within:text-[#0042B2] transition-colors" />
                  <input ref={emailRef} type="email" value={form.email} onChange={(e) => { setForm(prev => ({ ...prev, email: e.target.value })); if (errors.email) setErrors(prev => ({ ...prev, email: "" })); }} placeholder="Email" className={`w-full h-12 pl-11 pr-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 ${errors.email? "border-red-500" : "border-transparent focus:border-[#0042B2]"} outline-none  font-medium transition-all`} />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.email}</p>}
              </div>

              <div>
                <div className="relative group">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 group-focus-within:text-[#0042B2] transition-colors" />
                  <input type={show? "text" : "password"} value={form.password} onChange={(e) => { setForm(prev => ({
  ...prev,
  password: e.target.value,
})); if (errors.password) setErrors({...errors, password: ""}); }} placeholder="Mật khẩu" className={`w-full h-12 pl-11 pr-11 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 ${errors.password? "border-red-500" : "border-transparent focus:border-[#0042B2]"} outline-none font-medium transition-all`} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1">
                    {show? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded border-2 border-zinc-300 text-[#0042B2] focus:ring-[#0042B2]/20" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white">Ghi nhớ</span>
                </label>
                <Link href="/forgot-password" className="text-sm font-semibold text-[#0042B2] hover:underline">Quên mật khẩu?</Link>
              </div>

              <motion.button type="submit" whileTap={{ scale: 0.98 }} disabled={loading || googleLoading || magicLoading} className="w-full h-12 rounded-2xl bg-[#0042B2] text-white font-bold shadow-lg shadow-[#0042B2]/25 hover:shadow-xl hover:shadow-[#0042B2]/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {loading? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang đăng nhập...</> : "Đăng nhập"}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-zinc-200 dark:bg-zinc-800" /></div>
              <div className="relative flex justify-center"><span className="bg-white dark:bg-zinc-950 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">hoặc</span></div>
            </div>

            {/* Social */}
            <div className="space-y-2.5">
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleGoogleLogin} disabled={loading || googleLoading || magicLoading} className="w-full h-11 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2.5 shadow-sm">
                <FcGoogle size={20} />
                <span>{googleLoading? "Đang kết nối..." : "Tiếp tục với Google"}</span>
              </motion.button>

              <motion.button whileTap={{ scale: 0.98 }} onClick={handleMagicLink} disabled={loading || googleLoading || magicLoading} className="w-full h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 font-semibold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                <FiSend size={18} className="text-zinc-600" />
                <span>{magicLoading? "Đang gửi..." : "Gửi link qua Email"}</span>
              </motion.button>

              {passkeySupported && (
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => toast.info("Passkey đang phát triển")} className="w-full h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 font-semibold text-sm transition-all flex items-center justify-center gap-2">
                  <FiSmartphone size={18} className="text-zinc-600" />
                  <span>Đăng nhập bằng Face ID</span>
                </motion.button>
              )}
            </div>

            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mt-6">
              Chưa có tài khoản? <Link href="/register" className="font-bold text-[#0042B2] hover:underline">Đăng ký ngay</Link>
            </p>
          </motion.div>

          <p className="text-center text-xs text-zinc-500 mt-4 px-4">
            Bằng cách đăng nhập, bạn đồng ý với <Link href="/terms" className="underline hover:text-zinc-700">Điều khoản</Link> và <Link href="/privacy" className="underline hover:text-zinc-700">Chính sách</Link>
          </p>
        </div>
      </div>
    </>
  );
}