"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { FiUser, FiArrowRight } from "react-icons/fi";

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
  const { user, userData, loading, refreshToken } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 1. Guard: đã onboard rồi thì đá về home
  useEffect(() => {
    if (!loading && userData?.onboardingCompleted) {
      router.replace("/");
    }
  }, [loading, userData, router]);

  // 2. Auto focus + prefill từ Google/Auth hoặc email
  useEffect(() => {
    if (user &&!displayName) {
      const fallback = user.email?.split('@')[0] || `User${user.uid.slice(0,4)}`;
      const name = sanitizeDisplayName(user.displayName || "", fallback);
      setDisplayName(name);
    }
    inputRef.current?.focus();
  }, [user, displayName]);

  // 3. Validation real-time
  const validate = (name: string): string => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return "Tên tối thiểu 2 ký tự";
    if (trimmed.length > 50) return "Tên tối đa 50 ký tự";
    if (trimmed === "Ẩn danh") return "Không được dùng tên 'Ẩn danh'";
    if (!/^[\p{L}\s0-9]+$/u.test(trimmed)) return "Tên chỉ chứa chữ cái, số và khoảng trắng";
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayName(val);
    setError(validate(val));
  };

  // 4. Submit bằng Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" &&!error && displayName.trim() &&!saving) {
      handleSave();
    }
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
      const lowerName = trimmed.toLowerCase();

      // Lấy data cũ để giữ username/userId nếu có
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const oldData = userDoc.data();

      const username = oldData?.username || generateUsername(trimmed);
      const userId = oldData?.userId || `AIR${currentUser.uid.slice(0, 6).toUpperCase()}`;
      const avatar = currentUser.photoURL || oldData?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmed)}&background=0A84FF&color=fff&bold=true`;

      // Update song song Auth + Firestore
      await Promise.all([
        updateProfile(currentUser, {
          displayName: trimmed,
          photoURL: avatar
        }),
        updateDoc(doc(db, "users", currentUser.uid), {
          displayName: trimmed,
          nameLower: lowerName,
          username,
          userId,
          photoURL: avatar,
          searchKeywords: [
            lowerName,
            lowerName.replace(/\s+/g, ""),
         ...lowerName.split(" ").filter((w: string) => w.length >= 2),
            userId.toLowerCase(),
            username.toLowerCase(),
          ],
          onboardingCompleted: true,
          updatedAt: serverTimestamp(),
        })
      ]);

      await refreshToken(); // Refresh cookie cho middleware
      toast.success(`Chào mừng, ${trimmed}!`);
      router.refresh();
      router.replace("/");
    } catch (e: any) {
      console.error("Onboarding error:", e);
      setError("Không thể lưu. Thử lại sau.");
      toast.error("Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  // 5. Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 6. Đã onboard rồi thì không render
  if (userData?.onboardingCompleted) return null;

  const isValid = displayName.trim().length >= 2 &&!error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full"
      >
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/5 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiUser size={32} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Chào mừng bạn!
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Nhập tên để mọi người nhận ra bạn
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Tên hiển thị
              </label>
              <input
                ref={inputRef}
                type="text"
                value={displayName}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="VD: Nguyễn Văn A"
                maxLength={50}
                disabled={saving}
                className={`w-full px-4 py-3 rounded-xl border-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none transition-all ${
                  error
                 ? "border-red-500 focus:border-red-600"
                    : "border-zinc-200 dark:border-zinc-700 focus:border-blue-600"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 dark:text-red-400 mt-2"
                >
                  {error}
                </motion.p>
              )}
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                {displayName.length}/50 ký tự
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving ||!isValid}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              {saving? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span>Bắt đầu</span>
                  <FiArrowRight size={20} />
                </>
              )}
            </motion.button>
          </div>

          <p className="text-xs text-center text-zinc-500 dark:text-zinc-600 mt-6">
            Bạn có thể đổi tên sau trong Cài đặt
          </p>
        </div>
      </motion.div>
    </div>
  );
}