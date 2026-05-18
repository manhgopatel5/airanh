"use client";

import LottiePlayer from "@/components/ui/LottiePlayer";
import * as L from "@/components/illustrations";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-background grid place-items-center">
      <div className="flex flex-col items-center gap-4">
        <LottiePlayer
          animationData={L.loadingPull}
          loop
          autoplay
          className="w-36 h-36"
          aria-label="Đang tải"
        />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Đang tải...
        </p>
      </div>
    </div>
  );
}