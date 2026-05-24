"use client";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { motion } from 'framer-motion';

const LottieWrapper = ({ active, children }: { active: boolean, children: React.ReactNode }) => (
  <motion.div 
    className="absolute inset-0 flex items-center justify-center"
    animate={active ? { 
      scale: [1, 1.05, 1],
    } : { 
      scale: 0.85, 
      opacity: 0.5 
    }}
    transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
  >
    {children}
  </motion.div>
);

export const Briefcase3D = ({ active }: { active: boolean }) => (
  <LottieWrapper active={active}>
    <DotLottieReact
      src="/animations/briefcase.lottie"
      autoplay={active}
      loop={active}
      style={{ 
        width: '100%', 
        height: '100%',
        maxWidth: '48px',
        maxHeight: '48px'
      }}
    />
  </LottieWrapper>
);

export const Palm3D = ({ active }: { active: boolean }) => (
  <LottieWrapper active={active}>
    <DotLottieReact
      src="/animations/palm.lottie"
      autoplay={active}
      loop={active}
      style={{ 
        width: '100%', 
        height: '100%',
        maxWidth: '48px',
        maxHeight: '48px'
      }}
    />
  </LottieWrapper>
);