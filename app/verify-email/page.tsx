"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

export default function OnboardingForm() {
  const { user, userData, loading: authLoading, refreshToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Fix 1: Luôn có default redirect, không bao giờ undefined
  const redirectTo = getSafeRedirect(searchParams.get("redirect")) || "/";

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return; // Fix 2: Đợi auth load xong mới check

    if (!user) {
      router.replace("/login");
      return;
    }

    // Nếu đã onboarding rồi thì đá ra
    if (userData?.onboardingCompleted) {
      router.replace(redirectTo);
      return;
    }

    // Fix 3: Check emailVerified nếu app của bạn yêu cầu
    if (user &&!user.emailVerified) {
      toast.error("Vui lòng xác thực email trước");
      router.replace("/verify-email"); // hoặc /login
      return;
    }
  }, [authLoading, redirectTo, router, user, userData]);

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
      router.push("/login");
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

  // Fix 4: Show loading khi authLoading hoặc chưa có userData
  if (authLoading ||!user || userData === undefined) {
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

  // Đã onboard rồi thì không render gì, useEffect sẽ redirect
  if (userData?.onboardingCompleted) return null;

  const isValid = displayName.trim().length >= 2 &&!error;

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
      {/*... giữ nguyên phần JSX còn lại... */}
    </div>
  );
}