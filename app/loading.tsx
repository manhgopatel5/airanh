"use client";

import LottiePlayer from "@/components/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#FAFAFB] dark:bg-zinc-950 grid place-items-center">
      <div className="flex flex-col items-center gap-4">
        <LottiePlayer
          animationData={loadingPull}
          loop
          autoplay
          className="w-36 h-36"
          aria-label="Loading..."
          pauseWhenHidden={false}
        />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}