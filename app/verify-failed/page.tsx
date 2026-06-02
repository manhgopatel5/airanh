"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { FiXCircle } from "react-icons/fi";
import HuhaLogo from "@/components/brand/HuhaLogo";

export default function VerifyFailed() {
  const params = useSearchParams();
  const router = useRouter();
  const reason = params.get("reason");

  const getMessage = () => {
    switch (reason) {
      case "expired":
        return "Link xác thực đã hết hạn. Vui lòng yêu cầu gửi lại email.";
      case "invalid":
        return "Link không hợp lệ hoặc đã bị xóa.";
      case "error":
        return "Có lỗi xảy ra. Vui lòng thử lại sau.";
      default:
        return "Link xác thực không hợp lệ.";
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10"><HuhaLogo /></div>
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <FiXCircle className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Xác thực thất bại</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            {getMessage()}
          </p>
        </div>
        <button
          onClick={() => router.replace("/verify-email")}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98]"
        >
          Quay lại trang xác thực
        </button>
      </div>
    </div>
  );
}