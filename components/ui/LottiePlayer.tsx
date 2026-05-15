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

  // Support cả play và autoplay
  const shouldAutoplay = play ?? autoplay;

  // Reduced motion
  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    setReducedMotion(media.matches);

    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    media.addEventListener("change", handler);

    return () => {
      media.removeEventListener("change", handler);
    };
  }, []);

// Pause khi ra khỏi viewport
useEffect(() => {
  if (!pauseWhenHidden || !containerRef.current) return;

  const observer = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries.at(0);

      if (!entry) return;

      setIsInView(entry.isIntersecting);
    },
    {
      threshold: 0.1,
    }
  );

  observer.observe(containerRef.current);

  return () => {
    observer.disconnect();
  };
}, [pauseWhenHidden]);

  // Control animation
  useEffect(() => {
    if (!ref.current) return;

    if (reducedMotion) {
      ref.current.pause();
      ref.current.goToAndStop(0, true);
      return;
    }

    ref.current.setSpeed(speed);

    if (isInView && (shouldAutoplay || !playOnHover)) {
      ref.current.play();
    } else {
      ref.current.pause();
    }
  }, [
    isInView,
    shouldAutoplay,
    playOnHover,
    speed,
    reducedMotion,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      onMouseEnter={() => {
        if (playOnHover) {
          ref.current?.play();
        }
      }}
      onMouseLeave={() => {
        if (playOnHover) {
          ref.current?.pause();
        }
      }}
      role="img"
      aria-label={ariaLabel}
    >
      <Lottie
        lottieRef={ref}
        animationData={animationData}
        loop={loop && !reducedMotion}
        autoplay={false}
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