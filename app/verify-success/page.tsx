"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { FiCheckCircle } from "react-icons/fi";
import HuhaLogo from "@/components/brand/HuhaLogo";

export default function VerifySuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const isAlready = params.get("status") === "already";

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
            {isAlready ? "Email đã xác thực" : "Xác thực thành công!"}
          </h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            {isAlready 
              ? "Email này đã được xác thực trước đó." 
              : "Bạn có thể đăng nhập vào Huha ngay bây giờ."}
          </p>
        </div>
        <button
          onClick={() => router.replace("/")}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98]"
        >
          Vào trang chủ
        </button>
      </div>
    </div>
  );
}