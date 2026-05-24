"use client";
import { motion } from "framer-motion";

export const Briefcase3D = ({ active }: { active: boolean }) => (
  <motion.div
    className="relative w-7 h-7"
    animate={active? {
      y: [0, -3, 0],
      scale: [1, 1.12, 1],
      rotateZ: [0, -2, 2, 0],
    } : { y: 0, scale: 1, rotateZ: 0 }}
    transition={{
      duration: 0.7,
      ease: [0.34, 1.56, 0.64, 1],
      times: [0, 0.3, 0.6, 1]
    }}
  >
    {/* Shadow đáy dynamic */}
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-1.5 rounded-full blur-sm"
      animate={{
        scaleX: active? 1.3 : 1,
        opacity: active? 0.4 : 0.15,
        background: active? 'rgba(10, 132, 255, 0.5)' : 'rgba(0,0,0,0.2)'
      }}
      transition={{ duration: 0.3 }}
    />

    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <defs>
        {/* Gradient chính */}
        <linearGradient id="briefcaseMain" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8BC4FF" />
          <stop offset="50%" stopColor="#4DA3FF" />
          <stop offset="100%" stopColor="#0A84FF" />
        </linearGradient>

        {/* Gradient nắp */}
        <linearGradient id="briefcaseLid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5BA3FF" />
          <stop offset="100%" stopColor="#0051D5" />
        </linearGradient>

        {/* Gradient kim loại */}
        <linearGradient id="metalShine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0E0E0" />
          <stop offset="50%" stopColor="#BDBDBD" />
          <stop offset="100%" stopColor="#9E9E9E" />
        </linearGradient>

        {/* Shadow filter */}
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0A84FF" floodOpacity="0.4"/>
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.2"/>
        </filter>

        {/* Glow filter */}
        <filter id="blueGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Base shadow */}
      {active && (
        <ellipse cx="16" cy="28" rx="10" ry="1.5" fill="#000000" opacity="0.1" />
      )}

      {/* Thân cặp chính */}
      <rect
        x="4" y="10" width="24" height="18" rx="2.5"
        fill={active? "url(#briefcaseMain)" : "#E5E7EB"}
        filter={active? "url(#softShadow)" : "none"}
      />

      {/* Nắp cặp với gradient */}
      <rect
        x="4" y="10" width="24" height="9" rx="2.5"
        fill={active? "url(#briefcaseLid)" : "#D1D5DB"}
      />

      {/* Highlight viền nắp */}
      {active && (
        <path
          d="M5 10H27"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.5"
        />
      )}

      {/* Quai xách 3D */}
      <path
        d="M11 10V6.5C11 5.67157 11.6716 5 12.5 5H19.5C20.3284 5 21 5.67157 21 6.5V10"
        stroke={active? "#003D99" : "#6B7280"}
        strokeWidth="2.8"
        strokeLinecap="round"
        filter={active? "url(#blueGlow)" : "none"}
      />

      {/* Khóa kim loại */}
      <g filter={active? "url(#blueGlow)" : "none"}>
        <rect
          x="13.5" y="15" width="5" height="4" rx="0.8"
          fill={active? "url(#metalShine)" : "#9CA3AF"}
        />
        <circle cx="16" cy="17" r="1.2" fill={active? "#0A84FF" : "#6B7280"} />
        <rect x="15.5" y="17" width="1" height="2" fill={active? "#5BA3FF" : "#D1D5DB"} />
      </g>

      {/* Highlight bóng kính */}
      {active && (
        <>
          <path
            d="M6 12L9 11L12 12"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          <ellipse cx="10" cy="14" rx="2" ry="1" fill="white" opacity="0.3" />
        </>
      )}

      {/* Texture vân da */}
      {active && (
        <g opacity="0.15">
          <circle cx="8" cy="20" r="0.5" fill="white" />
          <circle cx="24" cy="22" r="0.5" fill="white" />
          <circle cx="16" cy="24" r="0.5" fill="white" />
        </g>
      )}
    </svg>
  </motion.div>
);

export const Palm3D = ({ active }: { active: boolean }) => (
  <motion.div
    className="relative w-7 h-7"
    animate={active? {
      y: [0, -3, 0],
      scale: [1, 1.12, 1],
      rotateZ: [0, 2, -2, 0],
    } : { y: 0, scale: 1, rotateZ: 0 }}
    transition={{
      duration: 0.7,
      ease: [0.34, 1.56, 0.64, 1],
      times: [0, 0.3, 0.6, 1]
    }}
  >
    {/* Shadow đáy */}
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-1.5 rounded-full blur-sm"
      animate={{
        scaleX: active? 1.3 : 1,
        opacity: active? 0.4 : 0.15,
        background: active? 'rgba(48, 209, 88, 0.5)' : 'rgba(0,0,0,0.2)'
      }}
      transition={{ duration: 0.3 }}
    />

    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <defs>
        {/* Mặt trời gradient */}
        <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF5CC" />
          <stop offset="60%" stopColor="#FFD60A" />
          <stop offset="100%" stopColor="#FF9500" />
        </radialGradient>

        {/* Đảo gradient */}
        <linearGradient id="islandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE4C4" />
          <stop offset="50%" stopColor="#FFD4A3" />
          <stop offset="100%" stopColor="#FF9F40" />
        </linearGradient>

        {/* Lá gradient */}
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9FFFB0" />
          <stop offset="50%" stopColor="#5BEB7B" />
          <stop offset="100%" stopColor="#30D158" />
        </linearGradient>

        {/* Thân cây gradient */}
        <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E6C7A0" />
          <stop offset="50%" stopColor="#D4A574" />
          <stop offset="100%" stopColor="#A67C52" />
        </linearGradient>

        {/* Green glow */}
        <filter id="greenGlow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Soft shadow */}
        <filter id="palmShadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#30D158" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* Mặt trời với rays */}
      {active && (
        <g filter="url(#greenGlow)">
          <motion.circle
            cx="24" cy="7" r="3.5"
            fill="url(#sunGrad)"
            animate={{
              scale: [1, 1.15, 1],
              opacity: [1, 0.8, 1]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Tia nắng */}
          <g stroke="#FFD60A" strokeWidth="1" strokeLinecap="round" opacity="0.6">
            <line x1="24" y1="2" x2="24" y2="0" />
            <line x1="29" y1="7" x2="31" y2="7" />
            <line x1="27.5" y1="3.5" x2="29" y2="2" />
            <line x1="20.5" y1="3.5" x2="19" y2="2" />
          </g>
        </g>
      )}

      {/* Đảo với texture */}
      <ellipse
        cx="16" cy="24.5" rx="9" ry="3.5"
        fill={active? "url(#islandGrad)" : "#E5E7EB"}
        filter={active? "url(#palmShadow)" : "none"}
      />
      {active && (
        <>
          <ellipse cx="12" cy="24" rx="1" ry="0.5" fill="#FFD4A3" opacity="0.6" />
          <ellipse cx="20" cy="25" rx="1.5" ry="0.5" fill="#FFD4A3" opacity="0.6" />
        </>
      )}

      {/* Thân cây 3D */}
      <rect
        x="14.8" y="13" width="2.4" height="12" rx="1.2"
        fill={active? "url(#trunkGrad)" : "#D1D5DB"}
      />
      {active && (
        <>
          <rect x="15.5" y="14" width="0.5" height="10" fill="#A67C52" opacity="0.3" />
          <ellipse cx="16" cy="16" rx="0.8" ry="0.3" fill="#8B6F47" opacity="0.4" />
          <ellipse cx="16" cy="19" rx="0.8" ry="0.3" fill="#8B6F47" opacity="0.4" />
        </>
      )}

      {/* Lá cọ trái */}
      <motion.ellipse
        cx="10" cy="12.5" rx="5" ry="2.5"
        fill={active? "url(#leafGrad)" : "#D1D5DB"}
        transform="rotate(-35 10 12.5)"
        filter={active? "url(#greenGlow)" : "none"}
        animate={active? { rotate: [-35, -30, -35] } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Lá cọ phải */}
      <motion.ellipse
        cx="22" cy="12.5" rx="5" ry="2.5"
        fill={active? "url(#leafGrad)" : "#D1D5DB"}
        transform="rotate(35 22 12.5)"
        filter={active? "url(#greenGlow)" : "none"}
        animate={active? { rotate: [35, 30, 35] } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Lá cọ giữa */}
      <motion.ellipse
        cx="16" cy="9.5" rx="3.5" ry="3"
        fill={active? "url(#leafGrad)" : "#D1D5DB"}
        filter={active? "url(#greenGlow)" : "none"}
        animate={active? { scaleY: [1, 1.1, 1] } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Highlight lá */}
      {active && (
        <>
          <ellipse cx="11" cy="12" rx="2" ry="1" fill="white" opacity="0.4" transform="rotate(-35 11 12)" />
          <ellipse cx="21" cy="12" rx="2" ry="1" fill="white" opacity="0.4" transform="rotate(35 21 12)" />
          <ellipse cx="16" cy="9" rx="1.5" ry="1.2" fill="white" opacity="0.3" />
        </>
      )}
    </svg>
  </motion.div>
);