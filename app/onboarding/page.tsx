"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { FiAlertCircle, FiArrowRight, FiUser, FiCheck, FiShield } from "react-icons/fi";
import HuhaLogo from "@/components/brand/HuhaLogo";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { getSafeRedirect } from "@/components/auth/authRoutes";

// Fallback nếu chưa có cn()
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(" ");

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

export default function OnboardingPage() {
  const { user, userData, loading: authLoading, refreshToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const redirectTo = getSafeRedirect(searchParams.get("redirect"));

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading &&!user) router.replace("/login");
    if (!authLoading && userData?.onboardingCompleted) router.replace(redirectTo);
  }, [authLoading, redirectTo, router, user, userData]);

  useEffect(() => {
    if (user &&!displayName) {
      const fallback = user.email?.split("@")[0] || `User${user.uid.slice(0, 4)}`;
      setDisplayName(sanitizeDisplayName(user.displayName || "", fallback));
    }
    window.setTimeout(() => inputRef.current?.focus(), 120);
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
      router.push("/login");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const db = getFirebaseDB();
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const oldData = userDoc.data();
      const lowerName = trimmed.toLowerCase();
      const username = oldData?.username || generateUsername(trimmed);
      const userId = oldData?.userId || `AIR${currentUser.uid.slice(0, 6).toUpperCase()}`;
      const avatar = currentUser.photoURL || oldData?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmed)}&background=0A84FF&color=fff&bold=true`;

      await Promise.all([
        updateProfile(currentUser, { displayName: trimmed, photoURL: avatar }),
        updateDoc(doc(db, "users", currentUser.uid), {
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

      await refreshToken();
      toast.success(`Chào mừng, ${trimmed}!`);
      router.replace(redirectTo);
    } catch (err) {
      console.error("Onboarding error:", err);
      setError("Không thể lưu. Thử lại sau.");
      toast.error("Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  // Fix 1: Không return null nữa, show loading để chờ redirect
  if (authLoading ||!user || userData?.onboardingCompleted) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-sky-50 via-white to-blue-50 px-5 py-8 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="h-14 rounded-3xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-40 rounded-3xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-14 rounded-3xl bg-zinc-300 motion-safe:animate-pulse dark:bg-zinc-700" />
        </div>
      </div>
    );
  }

  const isValid = displayName.trim().length >= 2 &&!error;
  const avatarPreview = user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'A')}&background=0A84FF&color=fff&bold=true`;

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-8">
        <div className="flex items-center justify-between">
          <HuhaLogo />
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-200/60 bg-white/60 px-3 py-1.5 text-xs font-bold text-zinc-600 backdrop-blur-xl dark:border-zinc-700/60 dark:bg-zinc-800/60 dark:text-zinc-300">
            <FiShield className="h-3.5 w-3.5" />
            Bảo mật
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex-1"
        >
          <div className="rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-2xl shadow-zinc-900/5 backdrop-blur-2xl dark:border-zinc-700/50 dark:bg-zinc-900/70">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                <FiUser className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-zinc-900 dark:text-white">Hoàn tất hồ sơ</h1>
                <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Chọn tên hiển thị để chủ task và người nhận việc nhận ra bạn trong AIR.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-5">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                  >
                    <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3 rounded-2xl bg-zinc-50/80 p-3 dark:bg-zinc-800/60">
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-white dark:ring-zinc-900"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                    {displayName || "Tên của bạn"}
                  </p>
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Đây là cách người khác thấy bạn
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                  Tên hiển thị
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={displayName}
                    onChange={handleChange}
                    placeholder="VD: Nguyễn Văn A"
                    maxLength={50}
                    disabled={saving}
                    className={cn(
                      "h-14 w-full rounded-2xl border-2 bg-white px-4 text-base font-bold text-zinc-900 outline-none transition-all dark:bg-zinc-900 dark:text-white",
                      "placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
                      error
                      ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : "border-zinc-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-zinc-700"
                    )}
                  />
                  <AnimatePresence>
                    {isValid && displayName && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white"
                      >
                        <FiCheck className="h-3.5 w-3.5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between px-1 text-xs font-semibold">
                  <span className={cn(error? "text-red-500" : "text-zinc-500 dark:text-zinc-400")}>
                    {error || "Tên thật giúp tăng độ tin cậy khi nhận task."}
                  </span>
                  <span className="text-zinc-400">{displayName.length}/50</span>
                </div>
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: isValid? 0.98 : 1 }}
                disabled={saving ||!isValid}
                className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-xl shadow-sky-500/30 transition-all hover:shadow-2xl hover:shadow-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="absolute inset-0 bg-white/0 transition group-hover:bg-white/10" />
                {saving? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <span>Bắt đầu</span>
                    <FiArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Bạn có thể đổi tên sau trong Cài đặt.
        </p>
      </div>
    </div>
  );
}