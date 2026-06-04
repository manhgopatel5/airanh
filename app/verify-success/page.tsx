"use client";

import { useRouter } from "next/navigation";
import { FiCheckCircle, FiArrowRight } from "react-icons/fi";
import HuhaLogo from "@/components/brand/HuhaLogo";

export default function VerifySuccess() {
  const router = useRouter();

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
            Bạn đã tạo tài khoản thành công. Vui lòng đăng nhập lại và sử dụng.
          </p>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98]"
        >
          <FiArrowRight className="h-5 w-5" />
          Đăng nhập ngay
        </button>
      </div>
    </div>
  );
}