"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { 
  FiAlertCircle, FiArrowRight, FiUser, FiMail, FiHome, 
  FiMapPin, FiCalendar, FiPhone, FiUsers 
} from "react-icons/fi";
import HuhaLogo from "@/components/brand/HuhaLogo";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { getSafeRedirect } from "@/components/auth/authRoutes";

const generateUsername = (name: string) => {
  return name
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, "")
  .replace(/[^a-z0-9]/g, "")
  .slice(0, 20) || "user";
};

function OnboardingContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const redirectTo = getSafeRedirect(searchParams.get("redirect")) || "/";

  const [form, setForm] = useState({
    displayName: "",
    phone: "",
    birthDate: "",
    gender: "",
    address: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Guard: Chưa login hoặc đã onboarded
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.replace("/login");
      return;
    }
    
    const db = getFirebaseDB();
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.data()?.onboarded) {
        router.replace(redirectTo);
      }
    });
  }, [user, authLoading, router, redirectTo]);

  useEffect(() => {
    if (user &&!form.displayName) {
      const fallback = user.email?.split("@")[0] || `User${user.uid.slice(0, 4)}`;
      const name = user.displayName || fallback;
      setForm(prev => ({...prev, displayName: name === "Ẩn danh"? fallback : name }));
    }
    const timer = window.setTimeout(() => nameRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [user, form.displayName]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (form.displayName.trim().length < 2) newErrors.displayName = "Tên tối thiểu 2 ký tự";
    if (form.displayName.trim().length > 50) newErrors.displayName = "Tên tối đa 50 ký tự";
    if (!/^[\p{L}\s0-9]+$/u.test(form.displayName.trim())) newErrors.displayName = "Tên chỉ chứa chữ, số và khoảng trắng";
    
    if (!/^0\d{9,10}$/.test(form.phone)) newErrors.phone = "SĐT phải có 10-11 số, bắt đầu bằng 0";
    
    if (!form.birthDate) newErrors.birthDate = "Chọn ngày sinh";
    else {
      const age = new Date().getFullYear() - new Date(form.birthDate).getFullYear();
      if (age < 13) newErrors.birthDate = "Bạn phải từ 13 tuổi trở lên";
      if (age > 100) newErrors.birthDate = "Ngày sinh không hợp lệ";
    }
    
    if (!form.gender) newErrors.gender = "Chọn giới tính";
    if (form.address.trim().length < 5) newErrors.address = "Địa chỉ tối thiểu 5 ký tự";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({...prev, [field]: "" }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("Phiên đăng nhập hết hạn");
      return;
    }

    setSaving(true);
    try {
      const db = getFirebaseDB();
      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      const oldData = userDoc.data();

      const trimmed = form.displayName.trim();
      const lowerName = trimmed.toLowerCase();
      const username = oldData?.username || generateUsername(trimmed);
      const userId = oldData?.userId || `AIR${currentUser.uid.slice(0, 6).toUpperCase()}`;
      const avatar =
        currentUser.photoURL ||
        oldData?.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmed)}&background=0A84FF&color=fff&bold=true`;

      await Promise.all([
        updateProfile(currentUser, { displayName: trimmed, photoURL: avatar }),
        updateDoc(userRef, {
          displayName: trimmed,
          nameLower: lowerName,
          username,
          userId,
          photoURL: avatar,
          phone: form.phone,
          birthDate: form.birthDate,
          gender: form.gender,
          address: form.address.trim(),
          searchKeywords: [
            lowerName,
            lowerName.replace(/\s+/g, ""),
          ...lowerName.split(" ").filter((word) => word.length >= 2),
            userId.toLowerCase(),
            username.toLowerCase(),
            form.phone,
          ],
          onboardingCompleted: true,
          onboarded: true,
          updatedAt: serverTimestamp(),
        }),
      ]);

      toast.success(`Chào mừng, ${trimmed}!`);
      setCompleted(true);
    } catch (err: any) {
      console.error("Onboarding error:", err);
      toast.error("Có lỗi xảy ra, thử lại sau");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="min-h-dvh bg-zinc-50 px-5 py-8 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-300 motion-safe:animate-pulse dark:bg-zinc-700" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!user.emailVerified) {
    return (
      <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10"><HuhaLogo /></div>
          <div className="mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <FiMail className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">
              Cần xác thực email
            </h1>
            <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Vui lòng xác thực email {user.email} trước khi hoàn tất hồ sơ
            </p>
          </div>
          <button
            onClick={() => router.replace("/verify-email")}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98]"
          >
            Đi xác thực email
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10"><HuhaLogo /></div>
          <div className="mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                <FiUser className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">
              Hoàn tất hồ sơ!
            </h1>
            <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Hồ sơ của bạn đã sẵn sàng. Bắt đầu khám phá Huha ngay
            </p>
          </div>
          <button
            onClick={() => router.replace(redirectTo)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98]"
          >
            <FiHome className="h-5 w-5" />
            Vào trang chủ
          </button>
        </div>
      </div>
    );
  }

  const inputClass = (field: string) => `h-14 w-full rounded-2xl border bg-zinc-50 pl-12 pr-4 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${
    errors[field]
    ? "border-red-400 focus:border-red-500"
      : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"
  }`;

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10"><HuhaLogo /></div>

        <div className="mb-8">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Hoàn tất hồ sơ</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Vui lòng điền đầy đủ thông tin để bắt đầu
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Tên hiển thị */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Tên hiển thị *</label>
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                ref={nameRef}
                type="text"
                value={form.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                maxLength={50}
                disabled={saving}
                className={inputClass("displayName")}
              />
            </div>
            {errors.displayName && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.displayName}
              </p>
            )}
          </div>

          {/* SĐT */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Số điện thoại *</label>
            <div className="relative">
              <FiPhone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="VD: 0912345678"
                maxLength={11}
                disabled={saving}
                className={inputClass("phone")}
              />
            </div>
            {errors.phone && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.phone}
              </p>
            )}
          </div>

          {/* Ngày sinh */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Ngày sinh *</label>
            <div className="relative">
              <FiCalendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => handleChange("birthDate", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                disabled={saving}
                className={inputClass("birthDate")}
              />
            </div>
            {errors.birthDate && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.birthDate}
              </p>
            )}
          </div>

          {/* Giới tính */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Giới tính *</label>
            <div className="relative">
              <FiUsers className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <select
                value={form.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                disabled={saving}
                className={inputClass("gender")}
              >
                <option value="">Chọn giới tính</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            {errors.gender && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.gender}
              </p>
            )}
          </div>

          {/* Địa chỉ */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Địa chỉ *</label>
            <div className="relative">
              <FiMapPin className="absolute left-4 top-4 h-5 w-5 text-zinc-400" />
              <textarea
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
                rows={3}
                disabled={saving}
                className={`w-full rounded-2xl border bg-zinc-50 pl-12 pr-4 py-4 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${
                  errors.address
                  ? "border-red-400 focus:border-red-500"
                    : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"
                }`}
              />
            </div>
            {errors.address && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.address}
              </p>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={saving}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition disabled:opacity-60"
          >
            {saving? (
              "Đang lưu..."
            ) : (
              <>
                <span>Hoàn tất hồ sơ</span>
                <FiArrowRight className="h-5 w-5" />
              </>
            )}
          </motion.button>
        </form>

        <p className="mt-8 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          * Bắt buộc. Bạn có thể chỉnh sửa sau trong Cài đặt
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-zinc-50 px-5 py-8 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}