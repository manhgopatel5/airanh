"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiSend, FiSmartphone } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import {
  signInWithEmailAndPassword, setPersistence, browserLocalPersistence,
  browserSessionPersistence, sendEmailVerification, signOut,
  GoogleAuthProvider, signInWithPopup, sendSignInLinkToEmail,
  isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged, Auth,
} from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, Firestore, runTransaction } from "firebase/firestore";
import { nanoid } from "nanoid";
import { toast, Toaster } from "sonner";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

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
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTo = searchParams.get("redirect") || "/chat";
  const loadingLottie = "/lotties/huha-loading-pull-full.lottie";

  useEffect(() => {
    authRef.current = getFirebaseAuth();
    dbRef.current = getFirebaseDB();
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(setPasskeySupported);
    }
    if (isSignInWithEmailLink(authRef.current, window.location.href)) {
      let email = localStorage.getItem("emailForSignIn");
      if (!email) email = window.prompt("Nhập email để xác nhận");
      if (email) {
        signInWithEmailLink(authRef.current, email, window.location.href)
      .then(async (result) => { localStorage.removeItem("emailForSignIn"); await updateUserDoc(result.user, dbRef.current!); toast.success("Đăng nhập thành công"); router.replace(redirectTo); })
      .catch(() => setErrors({ submit: "Link không hợp lệ hoặc đã hết hạn" }));
      }
    }
    const lastEmail = localStorage.getItem("last_email");
    if (lastEmail) setForm(prev => ({...prev, email: lastEmail }));
    const unsub = onAuthStateChanged(authRef.current, (user) => { if (user && user.emailVerified) { router.replace(redirectTo); } else { setAuthChecking(false); setTimeout(() => emailRef.current?.focus(), 100); } });
    return () => unsub();
  }, [router, redirectTo]);

  useEffect(() => { return () => { if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current); }; }, []);

  const validateField = (field: string, value: string) => {
    if (field === "email") { if (!value) return "Vui lòng nhập email"; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email không hợp lệ"; }
    if (field === "password" &&!value) return "Vui lòng nhập mật khẩu";
    return "";
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    (["email", "password"] as const).forEach((key) => { const err = validateField(key, form[key]); if (err) newErrors[key] = err; });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateUserDoc = async (user: any, db: Firestore) => {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef).catch(() => null);
    if (!snap ||!snap.exists()) {
      await runTransaction(db, async (tx) => {
        let userId = ""; for (let i = 0; i < 5; i++) { userId = `HUHA${nanoid(6).toUpperCase()}`; const q = await tx.get(doc(db, "userIds", userId)); if (!q.exists()) break; }
        const email = user.email || ""; const name = user.displayName || email.split("@")[0] || "User";
        let baseUsername = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, ""); if (!baseUsername) baseUsername = "user"; let username = baseUsername; let counter = 1;
        while (true) { const usernameDoc = await tx.get(doc(db, "usernames", username)); if (!usernameDoc.exists()) break; username = `${baseUsername}${counter}`; counter++; if (counter > 100) throw new Error("Không tạo được username"); }
        const newUser = { uid: user.uid, name, nameLower: name.toLowerCase(), username, userId, email: user.email || "", emailVerified: user.emailVerified, avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(email || "U")}&background=0042B2&color=fff`, bio: "", isOnline: true, lastSeen: serverTimestamp(), createdAt: serverTimestamp(), fcmTokens: [], status: "active", searchKeywords: [name.toLowerCase(), userId.toLowerCase(), username.toLowerCase()], hidden: false, deletedAt: null };
        tx.set(userRef, newUser); tx.set(doc(db, "userIds", userId), { uid: user.uid }); tx.set(doc(db, "usernames", username), { uid: user.uid });
      });
    } else {
      const data = snap.data() || {}; const updates: any = { online: true, lastSeen: serverTimestamp() };
      if (user.photoURL &&!data.avatar) updates.avatar = user.photoURL; if (user.displayName &&!data.name) updates.name = user.displayName;
      await updateDoc(userRef, updates);
    }
  };

  const checkBanned = async (uid: string) => {
    const db = dbRef.current; if (!db) return false; const snap = await getDoc(doc(db, "users", uid)); if (!snap.exists()) return false; const data = snap.data(); if (!data?.banned) return false;
    if (!data.bannedUntil) return { banned: true, until: null };
    const until = typeof data.bannedUntil?.toDate === "function"? data.bannedUntil.toDate() : new Date(data.bannedUntil);
    if (until.getTime() < Date.now()) return false; return { banned: true, until };
  };

  const handleMagicLink = async () => {
    const auth = authRef.current; if (!auth) return; if (!form.email) return setErrors({ email: "Nhập email trước" }); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErrors({ email: "Email không hợp lệ" });
    try { setMagicLoading(true); setErrors({}); await sendSignInLinkToEmail(auth, form.email, { url: window.location.origin + "/login", handleCodeInApp: true }); localStorage.setItem("emailForSignIn", form.email); localStorage.setItem("last_email", form.email); setMagicLinkSent(true); toast.success("Đã gửi link đăng nhập qua email"); } catch { setErrors({ submit: "Gửi link thất bại" }); } finally { setMagicLoading(false); }
  };

  const handleGoogleLogin = async () => {
    const auth = authRef.current; const db = dbRef.current; if (!auth ||!db) return toast.error("Firebase chưa sẵn sàng");
    try { setGoogleLoading(true); setErrors({}); await setPersistence(auth, remember? browserLocalPersistence : browserSessionPersistence); const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" }); const res = await signInWithPopup(auth, provider); await updateUserDoc(res.user, db); const bannedData = await checkBanned(res.user.uid); if (bannedData && bannedData.banned) { await signOut(auth); router.replace(bannedData.until? `/banned?until=${bannedData.until.getTime()}` : "/banned"); return; } localStorage.setItem("last_email", res.user.email || ""); toast.success("Đăng nhập thành công"); router.replace(redirectTo); } catch (err: any) { if (err.code === "auth/popup-blocked") setErrors({ submit: "Popup bị chặn. Cho phép popup và thử lại" }); else if (err.code!== "auth/popup-closed-by-user" && err.code!== "auth/cancelled-popup-request") setErrors({ submit: "Đăng nhập Google thất bại" }); } finally { setGoogleLoading(false); }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault(); if (form.honeypot) return; const auth = authRef.current; const db = dbRef.current; if (!auth ||!db) return toast.error("Firebase chưa sẵn sàng");
    const lastFail = localStorage.getItem("login_fail_time"); if (failedAttempts.current >= 3 && lastFail && Date.now() - parseInt(lastFail) < 30000) return setErrors({ submit: "Thử quá nhiều lần, đợi 30s" });
    if (!validate()) return;
    try { setLoading(true); setErrors({}); await setPersistence(auth, remember? browserLocalPersistence : browserSessionPersistence); const res = await signInWithEmailAndPassword(auth, form.email, form.password); const user = res.user; if (!user.emailVerified) { toast.warning("Vui lòng xác thực email trước"); await sendEmailVerification(user).catch(() => {}); router.replace("/verify-email"); return; } await updateUserDoc(user, db); const bannedData = await checkBanned(user.uid); if (bannedData && bannedData.banned) { await signOut(auth); router.replace(bannedData.until? `/banned?until=${bannedData.until.getTime()}` : "/banned"); return; } localStorage.setItem("last_email", form.email); failedAttempts.current = 0; localStorage.removeItem("login_fail_time"); toast.success("Đăng nhập thành công"); router.replace(redirectTo); } catch (err: any) { failedAttempts.current++; localStorage.setItem("login_fail_time", Date.now().toString()); const errorMap: Record<string, string> = { "auth/invalid-credential": "Email hoặc mật khẩu không đúng", "auth/user-not-found": "Tài khoản không tồn tại", "auth/wrong-password": "Mật khẩu không đúng", "auth/too-many-requests": "Thử quá nhiều lần", "auth/network-request-failed": "Lỗi mạng" }; setErrors({ submit: errorMap[err.code] || "Đăng nhập thất bại" }); } finally { setLoading(false); }
  };

  const handleShowPass = () => { setShow(!show); if (!show) { if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current); showTimeoutRef.current = setTimeout(() => setShow(false), 3000); } };

  if (authChecking) {
    return <div className="h-dvh bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center px-4"><div className="w-16 h-16"><DotLottieReact src={loadingLottie} autoplay loop /></div></div>;
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-dvh bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 border-white/20">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg" style={{background:'linear-gradient(135deg,#0042B2,#1A5FFF)'}}><span className="text-white text-3xl font-black">H</span></div>
              <h1 className="text-2xl font-bold text-zinc-900">Đăng nhập HUHA</h1>
            </div>

            {errors.submit && <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="text-red-600 mb-4 flex items-center gap-2 text-sm bg-red-50 px-3 py-2.5 rounded-xl"><FiAlertCircle size={16} />{errors.submit}</motion.div>}
            {magicLinkSent && <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="bg-[#E8F1FF] border border-[#0042B2]/20 text-[#0042B2] px-3 py-2.5 rounded-xl mb-4 flex items-center gap-2 text-sm"><FiSend size={16} />Đã gửi link! Kiểm tra email</motion.div>}

            <form onSubmit={handleLogin} className="space-y-4">
              <input type="text" className="hidden" value={form.honeypot} onChange={(e) => setForm({...form, honeypot: e.target.value })} />
              <div>
                <div className="relative"><FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input ref={emailRef} className={`w-full pl-10 pr-3 h-11 rounded-xl border text-sm ${errors.email? "border-red-500" : "border-zinc-300 dark:border-zinc-800"} bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none`} placeholder="Email" value={form.email} onChange={(e) => { setForm({...form, email: e.target.value }); if (errors.email) setErrors({...errors, email: "" }); }} /></div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <div className="relative"><FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} /><input type={show? "text" : "password"} className={`w-full pl-10 pr-10 h-11 rounded-xl border text-sm ${errors.password? "border-red-500" : "border-zinc-300 dark:border-zinc-800"} bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none`} placeholder="Mật khẩu" value={form.password} onChange={(e) => { setForm({...form, password: e.target.value }); if (errors.password) setErrors({...errors, password: "" }); }} /><button type="button" onClick={handleShowPass} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">{show? <FiEyeOff size={18} /> : <FiEye size={18} />}</button></div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded" style={{accentColor:'#0042B2'}} /><span className="text-sm text-zinc-700">Ghi nhớ</span></label>
                <Link href="/forgot-password" className="text-sm font-medium hover:underline" style={{color:'#0042B2'}}>Quên mật khẩu?</Link>
              </div>
              <motion.button type="submit" whileTap={{scale:0.98}} disabled={loading || googleLoading || magicLoading} className="w-full h-12 rounded-xl text-white font-semibold text-sm disabled:opacity-50 shadow-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#0042B2,#1A5FFF)',boxShadow:'0 8px 20px rgba(0,66,178,0.3)'}}>{loading? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Đang đăng nhập...</> : "Đăng nhập"}</motion.button>
            </form>

            <div className="relative my-5"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-300" /></div><div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-zinc-500">hoặc</span></div></div>

            <div className="space-y-3">
              <motion.button whileTap={{scale:0.98}} onClick={handleGoogleLogin} disabled={loading || googleLoading || magicLoading} className="w-full h-11 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-50 disabled:opacity-50 flex items-center justify-center gap-2"><FcGoogle size={20} />{googleLoading? "Đang kết nối..." : "Tiếp tục với Google"}</motion.button>
              <motion.button whileTap={{scale:0.98}} onClick={handleMagicLink} disabled={loading || googleLoading || magicLoading} className="w-full h-11 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-50 disabled:opacity-50 flex items-center justify-center gap-2"><FiSend size={18} />{magicLoading? "Đang gửi..." : "Email Link"}</motion.button>
              {passkeySupported && <motion.button whileTap={{scale:0.98}} onClick={()=>toast.info("Passkey đang phát triển")} disabled={loading || googleLoading || magicLoading} className="w-full h-11 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-50 disabled:opacity-50 flex items-center justify-center gap-2"><FiSmartphone size={18} />Face ID</motion.button>}
            </div>

            <p className="text-center text-sm text-zinc-600 mt-4">Chưa có tài khoản? <Link href="/register" className="font-semibold hover:underline" style={{color:'#0042B2'}}>Đăng ký</Link></p>
          </motion.div>
        </div>
      </div>
    </>
  );
}