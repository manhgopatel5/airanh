"use client";

import dynamic from "next/dynamic";
import { memo, useEffect, useRef } from "react";
import type { LottieRefCurrentProps } from "lottie-react";

const Lottie = dynamic(
  () => import("lottie-react").then((mod) => mod.default),
  {
    ssr: false,
  }
);

type Props = {
  animationData: object;
  loop?: boolean;
  autoplay?: boolean;
  play?: boolean;
  className?: string;
  speed?: number;
  playOnHover?: boolean;
  pauseWhenHidden?: boolean;
  "aria-label"?: string;
  onComplete?: () => void;
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
}: Props) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  // hỗ trợ cả play và autoplay
  const shouldAutoplay = play ?? autoplay;

  useEffect(() => {
    if (!lottieRef.current) return;

    lottieRef.current.setSpeed(speed);

    if (shouldAutoplay) {
      lottieRef.current.play();
    } else {
      lottieRef.current.pause();
    }
  }, [speed, shouldAutoplay]);

  if (!animationData) return null;

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
        {...(onComplete ? { onComplete } : {})}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}

export default memo(LottiePlayer);