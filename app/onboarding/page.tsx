"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FiArrowRight, FiUser } from "react-icons/fi";
import AuthShell from "@/components/auth/AuthShell";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

const generateUsername = (name: string) => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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
  const { user, userData, loading, refreshToken } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && userData?.onboardingCompleted) router.replace("/");
  }, [loading, router, user, userData]);

  useEffect(() => {
    if (user && !displayName) {
      const fallback = user.email?.split("@")[0] || `User${user.uid.slice(0, 4)}`;
      setDisplayName(sanitizeDisplayName(user.displayName || "", fallback));
    }
    inputRef.current?.focus();
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

  const handleSave = async () => {
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
      router.refresh();
      router.replace("/");
    } catch (err) {
      console.error("Onboarding error:", err);
      setError("Không thể lưu. Thử lại sau.");
      toast.error("Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthShell title="Đang chuẩn bị hồ sơ" description="AIR đang đồng bộ thông tin tài khoản của bạn." icon={<FiUser className="h-6 w-6" />}>
        <div className="space-y-3" role="status" aria-label="Đang tải">
          <div className="h-12 rounded-2xl bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-12 rounded-2xl bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-800" />
        </div>
      </AuthShell>
    );
  }

  if (!user || userData?.onboardingCompleted) return null;

  const isValid = displayName.trim().length >= 2 && !error;

  return (
    <AuthShell
      title="Hoàn tất hồ sơ"
      description="Chọn tên hiển thị để chủ task và người nhận việc nhận ra bạn trong AIR."
      icon={<FiUser className="h-6 w-6" />}
      footer="Bạn có thể đổi tên sau trong Cài đặt."
    >
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Tên hiển thị</span>
          <input
            ref={inputRef}
            type="text"
            value={displayName}
            onChange={handleChange}
            onKeyDown={(event) => {
              if (event.key === "Enter" && isValid && !saving) handleSave();
            }}
            placeholder="VD: Nguyễn Văn A"
            maxLength={50}
            disabled={saving}
            className={`h-12 w-full rounded-2xl border bg-white px-4 text-base font-semibold text-zinc-900 outline-none transition focus:ring-4 dark:bg-zinc-900 dark:text-white ${error ? "border-red-400 focus:ring-red-500/10" : "border-zinc-200 focus:border-sky-500 focus:ring-sky-500/10 dark:border-zinc-700"}`}
          />
        </label>
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className={error ? "text-red-500" : "text-zinc-400"}>{error || "Tên thật giúp tăng độ tin cậy khi nhận task."}</span>
          <span className="text-zinc-400">{displayName.length}/50</span>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving || !isValid}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-sm font-black text-white shadow-xl shadow-sky-500/25 transition disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : <><span>Bắt đầu</span><FiArrowRight className="h-4 w-4" /></>}
        </motion.button>
      </div>
    </AuthShell>
  );
}
