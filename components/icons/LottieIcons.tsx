"use client";
import { DotLottieReact } from '@dotlottie/react-player';
import { motion } from 'framer-motion';

export const Briefcase3D = ({ active }: { active: boolean }) => (
  <motion.div
    className="relative w-9 h-9"
    animate={active? {
      y: [0, -5, 0],
      scale: [1, 1.18, 1],
      rotateZ: [0, -4, 4, -2, 0],
    } : { 
      y: 0, 
      scale: 0.9, 
      rotateZ: 0,
      opacity: 0.55
    }}
    transition={{
      duration: 0.9,
      ease: [0.34, 1.56, 0.64, 1]
    }}
  >
    {/* Shadow pulse giữ lại cho đẹp */}
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-2.5 rounded-full blur-lg"
      animate={{
        scaleX: active? [1, 1.5, 1] : 1,
        opacity: active? [0.6, 0.3, 0.6] : 0.12,
        background: active? 'rgba(10, 132, 255, 0.7)' : 'rgba(0,0,0,0.15)'
      }}
      transition={{ duration: 1.8, repeat: active? Infinity : 0, ease: "easeInOut" }}
    />

    <DotLottieReact
      src="/animations/briefcase.lottie"
      autoplay={active}
      loop={active}
      style={{ width: '100%', height: '100%' }}
    />
  </motion.div>
);

export const Palm3D = ({ active }: { active: boolean }) => (
  <motion.div
    className="relative w-9 h-9"
    animate={active? {
      y: [0, -5, 0],
      scale: [1, 1.18, 1],
      rotateZ: [0, 4, -4, 3, 0],
    } : { 
      y: 0, 
      scale: 0.9, 
      rotateZ: 0,
      opacity: 0.55
    }}
    transition={{
      duration: 0.9,
      ease: [0.34, 1.56, 0.64, 1]
    }}
  >
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-2.5 rounded-full blur-lg"
      animate={{
        scaleX: active? [1, 1.5, 1] : 1,
        opacity: active? [0.6, 0.3, 0.6] : 0.12,
        background: active? 'rgba(48, 209, 88, 0.7)' : 'rgba(0,0,0,0.15)'
      }}
      transition={{ duration: 1.8, repeat: active? Infinity : 0, ease: "easeInOut" }}
    />

    <DotLottieReact
      src="/animations/palm.lottie"
      autoplay={active}
      loop={active}
      style={{ width: '100%', height: '100%' }}
    />
  </motion.div>
);
