"use client";
import { motion } from "framer-motion";

export const Briefcase3D = ({ active }: { active: boolean }) => (
  <motion.div
    className="relative w-9 h-9"
    animate={active? {
      y: [0, -4, 0],
      scale: [1, 1.15, 1],
      rotateZ: [0, -3, 3, -2, 0],
    } : { 
      y: 0, 
      scale: 0.92, 
      rotateZ: 0,
      opacity: 0.6
    }}
    transition={{
      duration: 0.8,
      ease: [0.34, 1.56, 0.64, 1],
      times: [0, 0.25, 0.5, 0.75, 1]
    }}
  >
    {/* Shadow đáy pulse */}
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-2 rounded-full blur-md"
      animate={{
        scaleX: active? [1, 1.4, 1] : 1,
        opacity: active? [0.5, 0.3, 0.5] : 0.15,
        background: active? 'rgba(10, 132, 255, 0.6)' : 'rgba(0,0,0,0.2)'
      }}
      transition={{ duration: 2, repeat: active? Infinity : 0, ease: "easeInOut" }}
    />

    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="briefcaseMain" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8BC4FF" />
          <stop offset="30%" stopColor="#6BB5FF" />
          <stop offset="70%" stopColor="#4DA3FF" />
          <stop offset="100%" stopColor="#0A84FF" />
        </linearGradient>
        <linearGradient id="briefcaseLid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5BA3FF" />
          <stop offset="50%" stopColor="#2E7EFF" />
          <stop offset="100%" stopColor="#0051D5" />
        </linearGradient>
        <linearGradient id="metalShine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5F5F5" />
          <stop offset="30%" stopColor="#E0E0E0" />
          <stop offset="50%" stopColor="#BDBDBD" />
          <stop offset="70%" stopColor="#9E9E9E" />
          <stop offset="100%" stopColor="#757575" />
        </linearGradient>
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0A84FF" floodOpacity="0.5"/>
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.25"/>
        </filter>
        <filter id="blueGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feFlood floodColor="#0A84FF" floodOpacity="1" result="glow"/>
          <feComposite in="glow" in2="blur" operator="in" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {active && <ellipse cx="16" cy="28.5" rx="11" ry="1.8" fill="#000000" opacity="0.12" />}

      <rect x="3" y="9" width="26" height="20" rx="3" fill={active? "url(#briefcaseMain)" : "#E5E7EB"} filter={active? "url(#softShadow)" : "none"} />
      <rect x="3" y="9" width="26" height="10" rx="3" fill={active? "url(#briefcaseLid)" : "#D1D5DB"} />

      {active && (
        <>
          <path d="M4.5 9.5H27.5" stroke="white" strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
          <ellipse cx="16" cy="12" rx="8" ry="2" fill="white" opacity="0.15" />
        </>
      )}

      <path d="M10.5 9V5.5C10.5 4.67 11.17 4 12 4H20C20.83 4 21.5 4.67 21.5 5.5V9" stroke={active? "#002E7A" : "#9CA3AF"} strokeWidth="3" strokeLinecap="round" filter={active? "url(#blueGlow)" : "none"} />

      <g filter={active? "url(#blueGlow)" : "none"}>
        <rect x="13" y="15" width="6" height="4.5" rx="1" fill={active? "url(#metalShine)" : "#9CA3AF"} />
        <circle cx="16" cy="17.2" r="1.5" fill={active? "#0A84FF" : "#6B7280"} />
        <rect x="15.3" y="17.2" width="1.4" height="2.5" fill={active? "#5BA3FF" : "#D1D5DB"} />
      </g>

      {active && (
        <>
          <path d="M5 11L8 10L11 11" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <path d="M21 11L24 10L27 11" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <ellipse cx="9" cy="15" rx="2.5" ry="1.2" fill="white" opacity="0.25" />
          <ellipse cx="23" cy="15" rx="2.5" ry="1.2" fill="white" opacity="0.25" />
        </>
      )}

      {active && (
        <g opacity="0.2">
          <circle cx="7" cy="19" r="0.6" fill="white" />
          <circle cx="25" cy="21" r="0.6" fill="white" />
          <circle cx="16" cy="25" r="0.6" fill="white" />
          <circle cx="10" cy="24" r="0.4" fill="white" />
          <circle cx="22" cy="24" r="0.4" fill="white" />
        </g>
      )}
    </svg>
  </motion.div>
);

export const Palm3D = ({ active }: { active: boolean }) => (
  <motion.div
    className="relative w-9 h-9"
    animate={active? {
      y: [0, -4, 0],
      scale: [1, 1.15, 1],
      rotateZ: [0, 3, -3, 2, 0],
    } : { 
      y: 0, 
      scale: 0.92, 
      rotateZ: 0,
      opacity: 0.6
    }}
    transition={{
      duration: 0.8,
      ease: [0.34, 1.56, 0.64, 1],
      times: [0, 0.25, 0.5, 0.75, 1]
    }}
  >
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-2 rounded-full blur-md"
      animate={{
        scaleX: active? [1, 1.4, 1] : 1,
        opacity: active? [0.5, 0.3, 0.5] : 0.15,
        background: active? 'rgba(48, 209, 88, 0.6)' : 'rgba(0,0,0,0.2)'
      }}
      transition={{ duration: 2, repeat: active? Infinity : 0, ease: "easeInOut" }}
    />

    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <defs>
        <radialGradient id="sun3D">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="15%" stopColor="#FFF9D6" />
          <stop offset="40%" stopColor="#FFE066" />
          <stop offset="70%" stopColor="#FFD60A" />
          <stop offset="100%" stopColor="#FF9500" />
        </radialGradient>

        <linearGradient id="rayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD60A" stopOpacity="1" />
          <stop offset="50%" stopColor="#FFD60A" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFD60A" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="island3D" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF5E6" />
          <stop offset="20%" stopColor="#FFE4C4" />
          <stop offset="50%" stopColor="#FFD4A3" />
          <stop offset="80%" stopColor="#FFB366" />
          <stop offset="100%" stopColor="#FF9F40" />
        </linearGradient>

        <pattern id="sandPattern" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill="#FFC47D" opacity="0.7" />
          <circle cx="3.5" cy="2.5" r="0.4" fill="#FFB366" opacity="0.6" />
          <circle cx="2" cy="4" r="0.35" fill="#FFA54F" opacity="0.5" />
          <circle cx="4" cy="1.5" r="0.3" fill="#FF9638" opacity="0.4" />
        </pattern>

        <linearGradient id="leaf3D" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C8FFD4" />
          <stop offset="25%" stopColor="#9FFFB0" />
          <stop offset="50%" stopColor="#7FE896" />
          <stop offset="75%" stopColor="#5BEB7B" />
          <stop offset="100%" stopColor="#30D158" />
        </linearGradient>

        <linearGradient id="trunk3D" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6B5345" />
          <stop offset="15%" stopColor="#8B6F47" />
          <stop offset="30%" stopColor="#A67C52" />
          <stop offset="50%" stopColor="#C19A6B" />
          <stop offset="70%" stopColor="#A67C52" />
          <stop offset="85%" stopColor="#8B6F47" />
          <stop offset="100%" stopColor="#6B5345" />
        </linearGradient>

        <filter id="greenGlow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feFlood floodColor="#30D158" floodOpacity="0.8" result="glow"/>
          <feComposite in="glow" in2="blur" operator="in" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <filter id="sunGlow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feFlood floodColor="#FFD60A" floodOpacity="1" result="glow"/>
          <feComposite in="glow" in2="blur" operator="in" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <filter id="palmShadow">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#30D158" floodOpacity="0.4"/>
        </filter>
      </defs>

      {active && (
        <g filter="url(#sunGlow)">
          <motion.g
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "24px 7px" }}
          >
            <line x1="24" y1="1.5" x2="24" y2="0" stroke="url(#rayGrad)" strokeWidth="2" strokeLinecap="round" />
            <line x1="29.5" y1="7" x2="31.5" y2="7" stroke="url(#rayGrad)" strokeWidth="2" strokeLinecap="round" />
            <line x1="18.5" y1="7" x2="16.5" y2="7" stroke="url(#rayGrad)" strokeWidth="2" strokeLinecap="round" />
            <line x1="24" y1="12.5" x2="24" y2="14.5" stroke="url(#rayGrad)" strokeWidth="2" strokeLinecap="round" />
            <line x1="28" y1="3" x2="29.5" y2="1.5" stroke="url(#rayGrad)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="20" y1="3" x2="18.5" y2="1.5" stroke="url(#rayGrad)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="28" y1="11" x2="29.5" y2="12.5" stroke="url(#rayGrad)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="20" y1="11" x2="18.5" y2="12.5" stroke="url(#rayGrad)" strokeWidth="1.5" strokeLinecap="round" />
          </motion.g>

          <motion.circle
            cx="24" cy="7" r="3.5"
            fill="url(#sun3D)"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.85, 1]
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>
      )}

      <ellipse cx="16" cy="25" rx="10" ry="4" fill={active? "url(#island3D)" : "#E5E7EB"} filter={active? "url(#palmShadow)" : "none"} />
      {active && (
        <>
          <ellipse cx="16" cy="25" rx="10" ry="4" fill="url(#sandPattern)" />
          <ellipse cx="16" cy="26.2" rx="8" ry="2.5" fill="#000000" opacity="0.12" />
          <ellipse cx="16" cy="23.8" rx="7" ry="1.8" fill="#FFFFFF" opacity="0.4" />
          <ellipse cx="11" cy="24.5" rx="1.2" ry="0.6" fill="#FFD4A3" opacity="0.7" />
          <ellipse cx="21" cy="25.5" rx="1.8" ry="0.7" fill="#FFD4A3" opacity="0.7" />
        </>
      )}

      <g filter={active? "url(#greenGlow)" : "none"}>
        <rect x="14.5" y="12" width="3" height="13.5" rx="1.5" fill={active? "url(#trunk3D)" : "#D1D5DB"} />
        {active && (
          <>
            <line x1="14.5" y1="14.5" x2="17.5" y2="14.5" stroke="#6B5345" strokeWidth="0.5" opacity="0.6" />
            <line x1="14.5" y1="17" x2="17.5" y2="17" stroke="#6B5345" strokeWidth="0.5" opacity="0.6" />
            <line x1="14.5" y1="19.5" x2="17.5" y2="19.5" stroke="#6B5345" strokeWidth="0.5" opacity="0.6" />
            <line x1="14.5" y1="22" x2="17.5" y2="22" stroke="#6B5345" strokeWidth="0.5" opacity="0.6" />
            <rect x="15.2" y="12.5" width="0.6" height="12" fill="#D4B896" opacity="0.7" rx="0.3" />
            <rect x="16.2" y="12.5" width="0.6" height="12" fill="#D4B896" opacity="0.5" rx="0.3" />
          </>
        )}
      </g>

      <g filter={active? "url(#greenGlow)" : "none"}>
        <motion.ellipse
          cx="9.5" cy="12" rx="5.5" ry="2.6"
          fill={active? "url(#leaf3D)" : "#D1D5DB"}
          transform="rotate(-38 9.5 12)"
          animate={active? { rotate: [-38, -32, -38] } : {}}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {active && (
          <>
            <line x1="9.5" y1="12" x2="5" y2="10" stroke="#1F8A3D" strokeWidth="0.8" opacity="0.7" transform="rotate(-38 9.5 12)" />
            <line x1="9.5" y1="12" x2="6" y2="13" stroke="#1F8A3D" strokeWidth="0.6" opacity="0.6" transform="rotate(-38 9.5 12)" />
            <line x1="9.5" y1="12" x2="6.5" y2="11.5" stroke="#1F8A3D" strokeWidth="0.5" opacity="0.5" transform="rotate(-38 9.5 12)" />
            <ellipse cx="8.5" cy="11.5" rx="2" ry="1" fill="white" opacity="0.5" transform="rotate(-38 8.5 11.5)" />
          </>
        )}
      </g>

      <g filter={active? "url(#greenGlow)" : "none"}>
        <motion.ellipse
          cx="22.5" cy="12" rx="5.5" ry="2.6"
          fill={active? "url(#leaf3D)" : "#D1D5DB"}
          transform="rotate(38 22.5 12)"
          animate={active? { rotate: [38, 32, 38] } : {}}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
        {active && (
          <>
            <line x1="22.5" y1="12" x2="27" y2="10" stroke="#1F8A3D" strokeWidth="0.8" opacity="0.7" transform="rotate(38 22.5 12)" />
            <line x1="22.5" y1="12" x2="26" y2="13" stroke="#1F8A3D" strokeWidth="0.6" opacity="0.6" transform="rotate(38 22.5 12)" />
            <line x1="22.5" y1="12" x2="25.5" y2="11.5" stroke="#1F8A3D" strokeWidth="0.5" opacity="0.5" transform="rotate(38 22.5 12)" />
            <ellipse cx="23.5" cy="11.5" rx="2" ry="1" fill="white" opacity="0.5" transform="rotate(38 23.5 11.5)" />
          </>
        )}
      </g>

      <g filter={active? "url(#greenGlow)" : "none"}>
        <motion.ellipse
          cx="16" cy="8.5" rx="3.8" ry="3.2"
          fill={active? "url(#leaf3D)" : "#D1D5DB"}
          animate={active? { scaleY: [1, 1.15, 1] } : {}}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
        {active && (
          <>
            <line x1="16" y1="8.5" x2="16" y2="5.5" stroke="#1F8A3D" strokeWidth="0.9" opacity="0.7" />
            <line x1="16" y1="8.5" x2="14" y2="6.5" stroke="#1F8A3D" strokeWidth="0.7" opacity="0.6" />
            <line x1="16" y1="8.5" x2="18" y2="6.5" stroke="#1F8A3D" strokeWidth="0.7" opacity="0.6" />
            <line x1="16" y1="8.5" x2="14.5" y2="7.5" stroke="#1F8A3D" strokeWidth="0.6" opacity="0.5" />
            <line x1="16" y1="8.5" x2="17.5" y2="7.5" stroke="#1F8A3D" strokeWidth="0.6" opacity="0.5" />
            <ellipse cx="16" cy="7.5" rx="1.5" ry="1.2" fill="white" opacity="0.5" />
          </>
        )}
      </g>

      {active && <ellipse cx="16" cy="27" rx="6" ry="1.5" fill="#000000" opacity="0.18" />}
    </svg>
  </motion.div>
);