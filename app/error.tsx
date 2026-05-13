"use client";
import { useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#FAFAFB] dark:bg-zinc-950 grid place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-32 h-32 mx-auto mb-6">
          <DotLottieReact
            src="/lotties/huha-empty-full.lottie"
            loop
            autoplay
          />
        </div>

        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          Ối, có lỗi rồi!
        </h2>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          HUHA đang gặp sự cố nhẹ, thử lại nhé
        </p>

        <button
          onClick={reset}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#0042B2] to-[#00C853] text-white font-semibold active:scale-98 transition-all"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}