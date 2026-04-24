"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEyeOff, FiEye, FiUser, FiAlertCircle } from "react-icons/fi";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { nanoid } from "nanoid";

export default function Register() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    website: "", // ✅ FIX 6: Honeypot
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({}); // ✅ FIX 3
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false); // ✅ FIX 7

  /* ================= REDIRECT IF LOGGED IN ✅ FIX 8 ================= */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) router.replace("/tasks");
    });
    return () => unsub();
  }, [router]);

  /* ================= PASSWORD STRENGTH ✅ FIX 5 ================= */
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score; // 0-4
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
        if (getPasswordStrength(value) < 3) return "Mật khẩu quá yếu: cần chữ hoa, thường, số";
        return "";
      case "confirmPassword":
        if (value !== form.password) return "Mật khẩu không khớp";
        return "";
      default:
        return "";
    }
  }, [form.password]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    Object.keys(form).forEach((key) => {
      if (key === "website") return; // Skip honeypot
      const err = validateField(key, form[key as keyof typeof form]);
      if (err) newErrors[key] = err;
    });
    if (!acceptTerms) newErrors.terms = "Vui lòng đồng ý điều khoản";
    if (!acceptPrivacy) newErrors.privacy = "Vui lòng đồng ý chính sách"; // ✅ FIX 7
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, acceptTerms, acceptPrivacy, validateField]);

  /* ================= REGISTER ✅ FIX 1+2 ================= */
  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (form.website) return; // ✅ FIX 6: Bot detected

    // ✅ FIX 1: Rate limit 60s
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
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCred.user;

      await updateProfile(user, { displayName: form.name });

      // ✅ FIX 10: Check userId unique
      let userId = `AIR${nanoid(6).toUpperCase()}`;
      let attempts = 0;
      while (attempts < 3) {
        const snap = await getDoc(doc(db, "usernames", userId));
        if (!snap.exists()) break;
        userId = `AIR${nanoid(6).toUpperCase()}`;
        attempts++;
      }

      await Promise.all([
        setDoc(doc(db, "users", user.uid), {
          email: form.email,
          name: form.name,
          userId,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name)}&background=random`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          emailVerified: false,
        }),
        setDoc(doc(db, "usernames", userId), { uid: user.uid }), // Reserve username
        sendEmailVerification(user), // ✅ FIX 2
      ]);

      // ✅ FIX 11: Analytics
      if (typeof window!== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "sign_up", { method: "email" });
      }

      router.replace("/verify-email"); // Chuyển trang verify
} catch (err: unknown) {
  const error = err as { code?: string };

  const errorMap: Record<string, string> = {
    "auth/email-already-in-use": "Email đã được sử dụng",
    "auth/invalid-email": "Email không hợp lệ",
    "auth/weak-password": "Mật khẩu quá yếu",
    "auth/network-request-failed": "Lỗi mạng, thử lại sau",
    "auth/too-many-requests": "Thử quá nhiều lần, thử lại sau",
  };

  const message =
    (error.code && errorMap[error.code]) ||
    "Đăng ký thất bại, thử lại sau";

  setErrors({ submit: message });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-white text-3xl font-bold">A</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">Tạo tài khoản</h1>
          <p className="text-gray-500 dark:text-zinc-400">Tham gia Airanh ngay hôm nay</p>
        </div>

        {errors.submit && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl mb-4 flex items-center gap-2 text-sm">
            <FiAlertCircle size={18} />
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleRegister}> {/* ✅ FIX 9: Enter submit */}
          {/* HONEYPOT ✅ FIX 6 */}
          <input type="text" name="website" value={form.website} onChange={handleChange("website")} className="hidden" tabIndex={-1} autoComplete="off" />

          {/* NAME */}
          <div className="mb-4">
            <div className="flex items-center bg-white dark:bg-zinc-900 rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <FiUser className="mr-3 text-gray-400 dark:text-zinc-500" size={20} />
              <input
                type="text"
                placeholder="Họ và tên"
                autoComplete="name" // ✅ FIX 4
                className="w-full outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                value={form.name}
                onChange={handleChange("name")}
                onBlur={() => handleBlur("name")} // ✅ FIX 3
              />
            </div>
            {touched.name && errors.name && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.name}</p>}
          </div>

          {/* EMAIL */}
          <div className="mb-4">
            <div className="flex items-center bg-white dark:bg-zinc-900 rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <FiMail className="mr-3 text-gray-400 dark:text-zinc-500" size={20} />
              <input
                type="email"
                placeholder="Email"
                autoComplete="email" // ✅ FIX 4
                className="w-full outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                value={form.email}
                onChange={handleChange("email")}
                onBlur={() => handleBlur("email")}
              />
            </div>
            {touched.email && errors.email && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.email}</p>}
          </div>

          {/* PASSWORD */}
          <div className="mb-4">
            <div className="flex items-center bg-white dark:bg-zinc-900 rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <FiLock className="mr-3 text-gray-400 dark:text-zinc-500" size={20} />
              <input
                type={showPass? "text" : "password"}
                placeholder="Mật khẩu"
                autoComplete="new-password" // ✅ FIX 4
                className="w-full outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                value={form.password}
                onChange={handleChange("password")}
                onBlur={() => handleBlur("password")}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="ml-2 text-gray-400 dark:text-zinc-500">
                {showPass? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
            {/* ✅ FIX 5: Strength meter */}
            {form.password && (
              <div className="flex gap-1 mt-2 ml-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${i < passStrength? passStrength < 2? "bg-red-500" : passStrength < 3? "bg-yellow-500" : "bg-green-500" : "bg-gray-200 dark:bg-zinc-700"}`} />
                ))}
              </div>
            )}
            {touched.password && errors.password && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.password}</p>}
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="mb-4">
            <div className="flex items-center bg-white dark:bg-zinc-900 rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <FiLock className="mr-3 text-gray-400 dark:text-zinc-500" size={20} />
              <input
                type={showConfirm? "text" : "password"}
                placeholder="Xác nhận mật khẩu"
                autoComplete="new-password"
                className="w-full outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                value={form.confirmPassword}
                onChange={handleChange("confirmPassword")}
                onBlur={() => handleBlur("confirmPassword")}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="ml-2 text-gray-400 dark:text-zinc-500">
                {showConfirm? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
            {touched.confirmPassword && errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.confirmPassword}</p>}
          </div>

          {/* TERMS + PRIVACY ✅ FIX 7 */}
          <div className="mb-6 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => { setAcceptTerms(e.target.checked); if (errors.terms) setErrors({...errors, terms: "" }); }} className="mt-0.5 w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500/20" />
              <span className="text-sm text-gray-600 dark:text-zinc-400">Tôi đồng ý với <Link href="/terms" className="text-blue-500 font-semibold">Điều khoản</Link></span>
            </label>
            {errors.terms && <p className="text-red-500 text-xs">{errors.terms}</p>}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptPrivacy} onChange={(e) => { setAcceptPrivacy(e.target.checked); if (errors.privacy) setErrors({...errors, privacy: "" }); }} className="mt-0.5 w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500/20" />
              <span className="text-sm text-gray-600 dark:text-zinc-400">Tôi đồng ý với <Link href="/privacy" className="text-blue-500 font-semibold">Chính sách bảo mật</Link></span>
            </label>
            {errors.privacy && <p className="text-red-500 text-xs">{errors.privacy}</p>}
          </div>

          <button type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang tạo tài khoản...</> : "Đăng ký"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600 dark:text-zinc-400">
          Đã có tài khoản? <Link href="/login" className="text-blue-500 font-semibold">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
