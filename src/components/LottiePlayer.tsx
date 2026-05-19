"use client";

import { memo, useEffect, useRef } from "react";
import lottie from "lottie-web";

export type LottiePlayerProps = {
  animationData?: any;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  fallback?: React.ReactNode;
  speed?: number;
  renderer?: "svg" | "canvas";
  onComplete?: () => void;
  "aria-label"?: string;
};

function LottiePlayer({
  animationData,
  loop = true,
  autoplay = true,
  className = "w-24 h-24",
  speed = 1,
  renderer = "svg",
  onComplete,
  "aria-label": ariaLabel = "Animation",
}: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !animationData) {
      return;
    }

    const instance = lottie.loadAnimation({
      container: containerRef.current,
      renderer,
      loop,
      autoplay,
      animationData,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
        progressiveLoad: true,
        hideOnTransparent: true,
      },
    });

    instance.setSpeed(speed);

    if (onComplete) {
      instance.addEventListener("complete", onComplete);
    }

    return () => {
      instance.destroy();
    };
  }, [
    animationData,
    autoplay,
    loop,
    speed,
    renderer,
    onComplete,
  ]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}

export default memo(LottiePlayer);