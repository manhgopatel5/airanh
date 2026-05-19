"use client";

import { memo, useEffect, useRef } from "react";
import lottie from "lottie-web";

export type LottiePlayerProps = {
  animationData?: object;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
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
  renderer = "canvas",
  onComplete,
  "aria-label": ariaLabel = "Animation",
}: LottiePlayerProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !containerRef.current ||
      !animationData
    ) {
      return;
    }

    containerRef.current.innerHTML = "";

    const instance = lottie.loadAnimation({
      container: containerRef.current,
      renderer,
      loop,
      autoplay,
      animationData,

      rendererSettings: {
        preserveAspectRatio:
          "xMidYMid meet",

        progressiveLoad: true,

        ...(renderer === "canvas"
          ? {
              clearCanvas: true,
            }
          : {}),

        hideOnTransparent: true,
      },
    });

    instance.setSpeed(speed);

    if (onComplete) {
      instance.addEventListener(
        "complete",
        onComplete
      );
    }

    return () => {
      if (onComplete) {
        instance.removeEventListener(
          "complete",
          onComplete
        );
      }

      instance.stop();
      instance.destroy();

      if (containerRef.current) {
        containerRef.current.innerHTML =
          "";
      }
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
      className={className}
      role="img"
      aria-label={ariaLabel}
      style={{
        overflow: "hidden",
        contain: "layout paint size",
      }}
    >
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}

export default memo(LottiePlayer);