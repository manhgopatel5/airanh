"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation"; // Thêm usePathname
import { updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FiAlertCircle, FiArrowRight, FiUser } from "react-icons/fi";
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

const sanitizeDisplayName = (name: string, fallback: string) => {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "Ẩn danh") return fallback;
  return trimmed;
};

function OnboardingContent() {
  const { user, userData, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname(); // Thêm dòng này
  const inputRef = useRef<HTMLInputElement>(null);

  const redirectTo = getSafeRedirect(searchParams.get("redirect")) || "/";

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fix: Chỉ redirect nếu đang ở /onboarding, tránh loop
useEffect(() => {
  if (!mounted || authLoading) return;
  if (pathname!== "/onboarding") return;

  if (user &&!user.emailVerified) {
    window.location.href = "/verify-email";
    return;
  }

  if (!user) {
    window.location.href = "/login";
    return;
  }

  // Quan trọng: Đợi userData load xong
  if (userData === undefined) return;

  if (userData?.onboardingCompleted) {
    window.location.href = redirectTo;
    return;
  }
}, [mounted, authLoading, redirectTo, user, userData, pathname]);

  useEffect(() => {
    if (user &&!displayName) {
      const fallback = user.email?.split("@")[0] || `User${user.uid.slice(0, 4)}`;
      setDisplayName(sanitizeDisplayName(user.displayName || "", fallback));
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [displayName, user]);

  const validate = (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return "Tên tối thiểu 2 ký tự";
    if (trimmed.length > 50) return "Tên tối đa 50 ký tự";
    if (trimmed === "Ẩn danh") return "Không được dùng tên Ẩn danh";
    if (!/^[\p{L}\s0-9]+$/u.test(trimmed)) return "Tên chỉ chứa chữ cái, số và khoảng trắng";
    return "";
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDisplayName(value);
    setError(validate(value));
  };

  const handleSave = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    const trimmed = displayName.trim();
    const validationError = validate(trimmed);

    if (validationError) {
      setError(validationError);
      inputRef.current?.focus();
      return;
    }
    if (!currentUser) {
      toast.error("Phiên đăng nhập hết hạn");
      window.location.href = "/login";
      return;
    }

    setSaving(true);
    setError("");
    try {
      const db = getFirebaseDB();
      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      const oldData = userDoc.data();

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
          searchKeywords: [
            lowerName,
            lowerName.replace(/\s+/g, ""),
    ...lowerName.split(" ").filter((word) => word.length >= 2),
            userId.toLowerCase(),
            username.toLowerCase(),
          ],
          onboardingCompleted: true,
          updatedAt: serverTimestamp(),
        }),
      ]);

      toast.success(`Chào mừng, ${trimmed}!`);
      window.location.href = redirectTo;
    } catch (err: any) {
      console.error("Onboarding error:", err);
      if (err.code === 'auth/user-token-expired') {
        toast.error("Phiên hết hạn, vui lòng đăng nhập lại");
        window.location.href = "/login";
        return;
      }
      setError("Không thể lưu. Thử lại sau.");
      toast.error("Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || authLoading ||!user || userData === undefined) {
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

  const isValid = displayName.trim().length >= 2 &&!error;

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10">
          <HuhaLogo />
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Hoàn tất hồ sơ</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Chọn tên hiển thị để mọi người nhận ra bạn trong huha.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
            >
              <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
              Tên hiển thị
            </label>
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                ref={inputRef}
                type="text"
                value={displayName}
                onChange={handleChange}
                placeholder="VD: Nguyễn Văn A"
                maxLength={50}
                disabled={saving}
                className={`h-14 w-full rounded-2xl border bg-zinc-50 pl-12 pr-4 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${
                  error
            ? "border-red-400 focus:border-red-500"
                    : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-zinc-500 dark:text-zinc-400">
                Tên thật giúp tăng độ tin cậy khi nhận task
              </span>
              <span className="text-zinc-400">{displayName.length}/50</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={saving ||!isValid}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition disabled:opacity-60"
          >
            {saving? (
              "Đang lưu..."
            ) : (
              <>
                <span>Bắt đầu với huha</span>
                <FiArrowRight className="h-5 w-5" />
              </>
            )}
          </motion.button>
        </form>

        <p className="mt-8 text-center text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          Bạn có thể đổi tên sau trong Cài đặt
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
          <div className="h-14 rounded-2xl bg-zinc-300 motion-safe:animate-pulse dark:bg-zinc-700" />
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}