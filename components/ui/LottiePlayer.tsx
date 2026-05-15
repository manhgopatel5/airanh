"use client";

import dynamic from "next/dynamic";
import { memo, useEffect, useRef, useState } from "react";
import type { LottieRefCurrentProps } from "lottie-react";

const Lottie = dynamic(
  () => import("lottie-react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-lg" />
  }
);

type Props = {
  animationData: object | null | undefined;
  loop?: boolean;
  autoplay?: boolean;
  play?: boolean;
  className?: string;
  speed?: number;
  playOnHover?: boolean;
  pauseWhenHidden?: boolean;
  "aria-label"?: string;
  onComplete?: () => void;
  fallback?: React.ReactNode;
};

function LottiePlayer({
  animationData,
  loop = true,
  autoplay = true,
  play,
  className = "w-24 h-24",
  speed = 1,
  "aria-label": ariaLabel,
  onComplete,
  fallback,
}: Props) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [hasError, setHasError] = useState(false);
  
  const shouldAutoplay = play ?? autoplay;

  useEffect(() => {
    if (!lottieRef.current) return;
    try {
      lottieRef.current.setSpeed(speed);
      if (shouldAutoplay) {
        lottieRef.current.play();
      } else {
        lottieRef.current.pause();
      }
    } catch (e) {
      console.error('Lottie error:', e);
      setHasError(true);
    }
  }, [speed, shouldAutoplay]);

  // Fix chính: không render gì nếu data null/undefined hoặc lỗi
  if (!animationData || hasError) {
    return fallback || null;
  }

  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={shouldAutoplay}
        onError={() => setHasError(true)}
        onComplete={onComplete}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}

export default memo(LottiePlayer);