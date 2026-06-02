"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiCheckCircle, FiLoader, FiArrowRight, FiHome } from "react-icons/fi";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import HuhaLogo from "@/components/brand/HuhaLogo";
import { useAuth } from "@/lib/AuthContext";

export default function VerifySuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      setChecking(false);
      return;
    }

    const checkOnboarding = async () => {
      try {
        const db = getFirebaseDB();
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const onboarded = userDoc.data()?.onboarded || false;
        setNeedsOnboarding(!onboarded);
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    };

    checkOnboarding();
  }, [user, loading]);

  if (loading || checking) {
    return (
      <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="mb-10"><HuhaLogo /></div>
          <FiLoader className="mx-auto h-12 w-12 animate-spin text-[#0A84FF]" />
          <h1 className="mt-6 text-2xl font-black text-zinc-900 dark:text-white">
            Đang xử lý...
          </h1>
        </div>
      </div>
    );
  }

  // Có user = đã auto login bằng session cookie
  if (user) {
    return (
      <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10"><HuhaLogo /></div>
          <div className="mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                <FiCheckCircle className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">
              Xác thực thành công!
            </h1>
            <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              {needsOnboarding 
                ? "Hoàn tất hồ sơ để bắt đầu sử dụng Huha" 
                : "Bạn đã sẵn sàng sử dụng Huha"}
            </p>
          </div>
          <button
            onClick={() => router.replace(needsOnboarding ? "/onboarding" : "/")}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98]"
          >
            {needsOnboarding ? (
              <>
                <FiArrowRight className="h-5 w-5" />
                Tiếp tục onboarding
              </>
            ) : (
              <>
                <FiHome className="h-5 w-5" />
                Vào trang chủ
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Không có user = lỗi cookie
  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10"><HuhaLogo /></div>
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400">
              <FiCheckCircle className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">
            Xác thực thành công!
          </h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Vui lòng đăng nhập để tiếp tục
          </p>
        </div>
        <button
          onClick={() => router.replace("/login")}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98]"
        >
          Đăng nhập ngay
        </button>
      </div>
    </div>
  );
}