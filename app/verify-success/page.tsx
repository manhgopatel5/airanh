"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiCheckCircle, FiLoader, FiArrowRight } from "react-icons/fi";
import { signInWithCustomToken } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import HuhaLogo from "@/components/brand/HuhaLogo";
import { toast } from "sonner";

export default function VerifySuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const auth = getFirebaseAuth();
  const customToken = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [needsOnboarding, setNeedsOnboarding] = useState(true);

  useEffect(() => {
    if (!customToken) {
      setStatus("error");
      return;
    }

    const autoLogin = async () => {
      try {
        // 1. Sign in bằng customToken
        const userCred = await signInWithCustomToken(auth, customToken);
        const idToken = await userCred.user.getIdToken(true);
        
        // 2. Set session cookie cho middleware
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (!res.ok) throw new Error("Set cookie failed");
        
        // 3. Check đã onboarding chưa
        const db = getFirebaseDB();
        const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
        const onboarded = userDoc.data()?.onboarded || false;
        setNeedsOnboarding(!onboarded);
        
        setStatus("success");
        toast.success("Xác thực thành công");
        
      } catch (error) {
        console.error(error);
        toast.error("Auto login thất bại");
        setStatus("error");
      }
    };

    autoLogin();
  }, [customToken, auth]);

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10"><HuhaLogo /></div>
        
        {status === "loading" && (
          <div className="text-center">
            <FiLoader className="mx-auto h-12 w-12 animate-spin text-[#0A84FF]" />
            <h1 className="mt-6 text-2xl font-black text-zinc-900 dark:text-white">
              Đang xác thực...
            </h1>
            <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Vui lòng chờ trong giây lát
            </p>
          </div>
        )}

        {status === "success" && (
          <>
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
                  ? "Bấm tiếp tục để hoàn tất hồ sơ" 
                  : "Bấm tiếp tục để vào trang chủ"}
              </p>
            </div>
            <button
              onClick={() => router.replace(needsOnboarding ? "/onboarding" : "/")}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98]"
            >
              <FiArrowRight className="h-5 w-5" />
              {needsOnboarding ? "Tiếp tục hoàn tất hồ sơ" : "Vào trang chủ"}
            </button>
          </>
        )}

        {status === "error" && (
          <div className="text-center">
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">
              Xác thực thất bại
            </h1>
            <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Link không hợp lệ hoặc đã hết hạn
            </p>
            <button
              onClick={() => router.replace("/login")}
              className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white"
            >
              Về trang đăng nhập
            </button>
          </div>
        )}
      </div>
    </div>
  );
}