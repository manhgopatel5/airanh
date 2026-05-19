"use client";

import dynamic from "next/dynamic";
import { memo, useEffect, useRef, useState, useCallback } from "react";
import type { LottieRefCurrentProps } from "lottie-react";

const Lottie = dynamic(
  () => import("lottie-react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-square w-full animate-pulse rounded-2xl bg-slate-100" />
    ),
  }
);

export type LottiePlayerProps = {
animationData?: any;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  speed?: number;
  playOnHover?: boolean;
  pauseWhenHidden?: boolean;
  reduceMotion?: "auto" | boolean;
  onComplete?: () => void;
  fallback?: React.ReactNode;
  "aria-label"?: string;
};

function LottiePlayer({
  animationData,
  loop = true,
  autoplay = true,
  className = "h-24 w-24",
  speed = 1,
  playOnHover = false,
  pauseWhenHidden = true,
  reduceMotion = "auto",
  onComplete,
  fallback = <div className="w-full h-full bg-slate-100 rounded-2xl" />,
  "aria-label": ariaLabel = "Animation",
}: LottiePlayerProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isInView, setIsInView] = useState(true);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (reduceMotion === "auto" && typeof window!== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReduced(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    setPrefersReduced(reduceMotion === true);
  }, [reduceMotion]);

  useEffect(() => {
    if (!pauseWhenHidden ||!containerRef.current) return;
    const el = containerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInView(entry?.isIntersecting?? false);
      },
      { threshold: 0.1, rootMargin: "50px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pauseWhenHidden]);

 const shouldPlay =
  !prefersReduced &&
  (pauseWhenHidden ? isInView : true) &&
  (playOnHover ? false : autoplay);

  useEffect(() => {
    const instance = lottieRef.current;
    if (!instance ||!isMounted) return;

    instance.setSpeed(speed);

    if (prefersReduced) {
      instance.goToAndStop(0, true);
      return;
    }

    if (shouldPlay) {
      instance.play();
    } else {
      instance.pause();
    }
  }, [shouldPlay, speed, prefersReduced, isMounted]);

  const handleEnter = useCallback(() => {
    if (playOnHover &&!prefersReduced && isInView) {
      lottieRef.current?.play();
    }
  }, [playOnHover, prefersReduced, isInView]);

  const handleLeave = useCallback(() => {
    if (playOnHover) {
      lottieRef.current?.pause();
    }
  }, [playOnHover]);

  if (!isMounted ||!animationData) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      role="img"
      aria-label={ariaLabel}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop &&!prefersReduced}
        autoplay={false}
        onComplete={onComplete}
        rendererSettings={{
          preserveAspectRatio: "xMidYMid meet",
          progressiveLoad: true,
          hideOnTransparent: true,
        }}
      />
    </div>
  );
}

export default memo(LottiePlayer);