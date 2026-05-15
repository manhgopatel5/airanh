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
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  speed?: number;
  "aria-label"?: string;
};

function LottiePlayer({
  animationData,
  loop = true,
  autoplay = true,
  className = "w-24 h-24",
  speed = 1,
  "aria-label": ariaLabel,
}: Props) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (!lottieRef.current) return;

    lottieRef.current.setSpeed(speed);

    if (autoplay) {
      lottieRef.current.play();
    } else {
      lottieRef.current.pause();
    }
  }, [speed, autoplay]);

  if (!animationData) return null;

  return (
    <div className={className} role="img" aria-label={ariaLabel}>
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}

export default memo(LottiePlayer);