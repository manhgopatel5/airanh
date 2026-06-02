"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FiXCircle, FiRefreshCw, FiArrowLeft, FiLogIn } from "react-icons/fi";
import HuhaLogo from "@/components/brand/HuhaLogo";

function VerifyFailedContent() {
  const params = useSearchParams();
  const router = useRouter();
  const reason = params.get("reason");

  const getContent = () => {
    switch (reason) {
      case "expired":
        return {
          title: "Link đã hết hạn",
          message: "Link xác thực chỉ có hiệu lực 24 giờ. Vui lòng yêu cầu gửi lại email mới.",
          buttonText: "Gửi lại email xác thực",
          buttonIcon: <FiRefreshCw className="h-5 w-5" />,
          buttonAction: "/verify-email"
        };
      case "used":
        return {
          title: "Link đã được sử dụng",
          message: "Tài khoản của bạn đã được xác thực rồi. Hãy đăng nhập để tiếp tục vào Huha.",
          buttonText: "Đăng nhập",
          buttonIcon: <FiLogIn className="h-5 w-5" />,
          buttonAction: "/login"
        };
      case "invalid":
        return {
          title: "Link không hợp lệ", 
          message: "Link này không tồn tại. Thử gửi lại email xác thực.",
          buttonText: "Quay lại trang xác thực",
          buttonIcon: <FiArrowLeft className="h-5 w-5" />,
          buttonAction: "/verify-email"
        };
      case "error":
        return {
          title: "Có lỗi xảy ra",
          message: "Không thể xác thực email lúc này. Vui lòng thử lại sau ít phút.",
          buttonText: "Thử lại",
          buttonIcon: <FiRefreshCw className="h-5 w-5" />,
          buttonAction: "/verify-email"
        };
      default:
        return {
          title: "Xác thực thất bại",
          message: "Link xác thực không hợp lệ hoặc đã hết hạn.",
          buttonText: "Quay lại trang xác thực", 
          buttonIcon: <FiArrowLeft className="h-5 w-5" />,
          buttonAction: "/verify-email"
        };
    }
  };

  const content = getContent();

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
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">
            {content.title}
          </h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            {content.message}
          </p>
        </div>
        <button
          onClick={() => router.replace(content.buttonAction)}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98]"
        >
          {content.buttonIcon}
          {content.buttonText}
        </button>
        
        {reason !== "used" && (
          <button
            onClick={() => router.replace("/login")}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-base font-black text-zinc-700 transition active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Về trang đăng nhập
          </button>
        )}
      </div>
    </div>
  );
}

export default function VerifyFailed() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-zinc-50 px-5 py-8 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
        </div>
      </div>
    }>
      <VerifyFailedContent />
    </Suspense>
  );
}