"use client";

import dynamic from "next/dynamic";
import { memo, useEffect, useRef, useState } from "react";
import type { LottieRefCurrentProps } from "lottie-react";


const Lottie = dynamic(
  () => import("lottie-react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-transparent" />
  }
);

type Props = {
  animationData?: object | null;
  loop?: boolean;
  autoplay?: boolean;
  play?: boolean;
  className?: string;
  speed?: number;
  
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
  const [isMounted, setIsMounted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const shouldAutoplay = play ?? autoplay;

  useEffect(() => {
    if (!lottieRef.current || !isMounted) return;
    try {
      lottieRef.current.setSpeed(speed);
      shouldAutoplay ? lottieRef.current.play() : lottieRef.current.pause();
    } catch (e) {
      setHasError(true);
    }
  }, [speed, shouldAutoplay, isMounted]);

  if (!isMounted || !animationData || hasError) {
    return fallback ? <div className={className}>{fallback}</div> : null;
  }

return (
  <div className={className} role="img" aria-label={ariaLabel}>
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={loop}
      autoplay={shouldAutoplay}
      onError={() => setHasError(true)}
      onComplete={onComplete || null} // đổi dòng này
      style={{ width: "100%", height: "100%" }}
    />
  </div>
);
}

export default memo(LottiePlayer);