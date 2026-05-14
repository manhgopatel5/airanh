"use client";

import dynamic from "next/dynamic";
import { memo, useEffect, useRef, useState } from "react";
import type { LottieRefCurrentProps } from "lottie-react";

const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full animate-pulse rounded-2xl bg-slate-100" />
  ),
});

type Props = {
  animationData: object;
  loop?: boolean;
  autoplay?: boolean;
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
  className = "h-24 w-24",
  speed = 1,
  playOnHover = false,
  pauseWhenHidden = true,
  "aria-label": ariaLabel,
  onComplete,
}: Props) {
  const ref = useRef<LottieRefCurrentProps>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(!pauseWhenHidden);
  const [reducedMotion, setReducedMotion] = useState(false);

  // 1. Tôn trọng reduced motion
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(m.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  // 2. Pause khi out of viewport
  useEffect(() => {
    if (!pauseWhenHidden ||!containerRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    io.observe(containerRef.current);
    return () => io.disconnect();
  }, [pauseWhenHidden]);

  // 3. Control play/pause
  useEffect(() => {
    if (!ref.current) return;
    if (reducedMotion) {
      ref.current.pause();
      ref.current.goToAndStop(0, true);
      return;
    }
    if (isInView && (autoplay ||!playOnHover)) {
      ref.current.setSpeed(speed);
      ref.current.play();
    } else {
      ref.current.pause();
    }
  }, [isInView, autoplay, playOnHover, speed, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className={className}
      onMouseEnter={() => playOnHover && ref.current?.play()}
      onMouseLeave={() => playOnHover && ref.current?.pause()}
      role="img"
      aria-label={ariaLabel}
    >
      <Lottie
        lottieRef={ref}
        animationData={animationData}
        loop={loop &&!reducedMotion}
        autoplay={false} // tự control ở trên
        onComplete={onComplete}
        rendererSettings={{
          preserveAspectRatio: "xMidYMid meet",
          progressiveLoad: true,
        }}
      />
    </div>
  );
}

export default memo(LottiePlayer);