"use client";

import { useEffect } from "react";
import LottiePlayer from "@/components/LottiePlayer";
import { errorShake } from "@/components/illustrations";

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
        <LottiePlayer
          animationData={errorShake}
          loop={false}
          autoplay
          className="w-32 h-32 mx-auto mb-6"
          aria-label="Lỗi ứng dụng"
          pauseWhenHidden={false}
        />

        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          Ối, có lỗi rồi!
        </h2>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          HUHA đang gặp sự cố nhẹ, thử lại nhé
        </p>

        <button
          onClick={() => {
            if (typeof navigator!== "undefined" && "vibrate" in navigator) {
              navigator.vibrate(10);
            }
            reset();
          }}
          className="w-full h-12 rounded-2xl bg-[#0042B2] text-white font-semibold active:scale-[0.98] transition-all hover:opacity-90"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}