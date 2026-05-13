"use client";

import LottiePlayer from "@/components/ui/LottiePlayer";

import loadingAnimation from "@/public/lotties/huha-loading-pull.json";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#FAFAFB] dark:bg-zinc-950 grid place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-36 h-36">
          <LottiePlayer
            animationData={loadingAnimation}
            className="w-full h-full"
          />
        </div>

        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 animate-pulse">
          Đang tải HUHA...
        </p>
      </div>
    </div>
  );
}