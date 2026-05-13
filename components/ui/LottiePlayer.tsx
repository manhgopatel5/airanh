"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
});

type Props = {
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
};

function LottiePlayer({
  animationData,
  loop = true,
  autoplay = true,
  className,
}: Props) {
  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      className={className}
      rendererSettings={{
        preserveAspectRatio: "xMidYMid meet",
      }}
    />
  );
}

export default memo(LottiePlayer);