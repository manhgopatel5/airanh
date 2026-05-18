"use client";

import { useEffect } from "react";
import LottiePlayer from "@/components/ui/LottiePlayer";
import errorShake from "@/assets/lotties/huha-error-shake.json";

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
    <div className="fixed inset-0 z- bg-background grid place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <LottiePlayer
          animationData={errorShake}
          loop={false}
          autoplay
          className="w-32 h-32 mx-auto mb-6"
          aria-label="Lỗi ứng dụng"
        />

        <h2 className="text-xl font-bold text-foreground mb-2">
          Ối, có lỗi rồi!
        </h2>

        <p className="text-sm text-muted-foreground mb-6">
          HUHA đang gặp sự cố nhẹ, thử lại nhé
        </p>

        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mb-6 p-3 rounded-xl bg-destructive/10 text-left">
            <p className="text-xs font-mono text-destructive break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-1">
                ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <button
          onClick={() => {
            if (typeof navigator!== "undefined" && "vibrate" in navigator) {
              navigator.vibrate(10);
            }
            reset();
          }}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold active:scale-[0.98] transition-all hover:opacity-90"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}