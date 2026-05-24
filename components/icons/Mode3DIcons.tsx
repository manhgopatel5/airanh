"use client";
import { motion } from "framer-motion";

export const Briefcase3D = ({ active }: { active: boolean }) => (
  <motion.div
    className="absolute inset-0 flex items-center justify-center"
    animate={active? {
      y: [0, -5, 0],
      scale: [1, 1.18, 1],
      rotateZ: [0, -4, 4, -3, 0],
      rotateY: [0, 5, -5, 0],
    } : { 
      y: 0, 
      scale: 0.9, 
      rotateZ: 0,
      rotateY: 0,
      opacity: 0.55
    }}
    transition={{
      duration: 0.9,
      ease: [0.34, 1.56, 0.64, 1],
      times: [0, 0.2, 0.5, 0.8, 1]
    }}
  >
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-2.5 rounded-full blur-lg"
      animate={{
        scaleX: active? [1, 1.5, 1] : 1,
        opacity: active? [0.6, 0.25, 0.6] : 0.12,
        background: active? 'rgba(10, 132, 255, 0.7)' : 'rgba(0,0,0,0.15)'
      }}
      transition={{ duration: 1.8, repeat: active? Infinity : 0, ease: "easeInOut" }}
    />

<svg viewBox="2 1 28 29" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="briefcaseMain" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#A5D6FF" />
          <stop offset="20%" stopColor="#8BC4FF" />
          <stop offset="40%" stopColor="#6BB5FF" />
          <stop offset="60%" stopColor="#4DA3FF" />
          <stop offset="80%" stopColor="#2E8EFF" />
          <stop offset="100%" stopColor="#0A84FF" />
        </linearGradient>
        <linearGradient id="briefcaseLid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7AB8FF" />
          <stop offset="30%" stopColor="#5BA3FF" />
          <stop offset="60%" stopColor="#2E7EFF" />
          <stop offset="100%" stopColor="#0051D5" />
        </linearGradient>
        <linearGradient id="metalShine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="15%" stopColor="#F8F8F8" />
          <stop offset="30%" stopColor="#E8E8E8" />
          <stop offset="50%" stopColor="#D0D0D0" />
          <stop offset="70%" stopColor="#B0B0B0" />
          <stop offset="85%" stopColor="#909090" />
          <stop offset="100%" stopColor="#707070" />
        </linearGradient>
        <radialGradient id="leatherTexture" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#5DA3FF" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#4DA3FF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0A84FF" stopOpacity="0.05" />
        </radialGradient>
      </defs>

      {active && <ellipse cx="16" cy="29" rx="12" ry="2" fill="#000000" opacity="0.15" />}

      {/* Bỏ filter={active? "url(#softShadow)" : "none"} */}
      <rect x="2.5" y="8.5" width="27" height="21" rx="3.5" fill={active? "url(#briefcaseMain)" : "#E5E7EB"} />
      {active && <rect x="2.5" y="8.5" width="27" height="21" rx="3.5" fill="url(#leatherTexture)" />}
      <rect x="2.5" y="8.5" width="27" height="11" rx="3.5" fill={active? "url(#briefcaseLid)" : "#D1D5DB"} />

      {active && (
        <>
          <ellipse cx="16" cy="11.5" rx="9" ry="2.5" fill="white" opacity="0.18" />
          <rect x="4" y="9" width="24" height="1.5" fill="white" opacity="0.6" rx="0.75" />
          <rect x="5" y="11" width="22" height="0.8" fill="white" opacity="0.3" rx="0.4" />
        </>
      )}

      <path d="M10 8.5V5C10 4.17 10.67 3.5 11.5 3.5H20.5C21.33 3.5 22 4.17 22 5V8.5H10.5Z" fill={active? "#002E7A" : "#9CA3AF"} />

      <g>
        <rect x="12.5" y="14.5" width="7" height="5" rx="1.2" fill={active? "url(#metalShine)" : "#9CA3AF"} />
        {active && (
          <motion.g
            animate={{ rotate: [0, 180, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "16px 17px" }}
          >
            <circle cx="16" cy="17" r="1.8" fill="#0A84FF" />
            <rect x="15.5" y="16" width="1" height="2.4" fill="#FFFFFF" rx="0.4" />
          </motion.g>
        )}
      </g>

      {active && (
        <motion.g
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <rect x="5.5" y="15.5" width="3.5" height="4.5" rx="0.6" fill="#FFFFFF" opacity="0.4" />
          <rect x="5.8" y="15.8" width="2.9" height="0.7" fill="#0A84FF" opacity="0.7" />
          <rect x="5.8" y="16.8" width="2.9" height="0.7" fill="#0A84FF" opacity="0.7" />
          <rect x="5.8" y="17.8" width="2.9" height="0.7" fill="#0A84FF" opacity="0.7" />
          <circle cx="7.3" cy="19.2" r="0.4" fill="#FFD60A" opacity="0.8" />
        </motion.g>
      )}

      {active && (
        <>
          <ellipse cx="8.5" cy="14.5" rx="3" ry="1.5" fill="white" opacity="0.25" />
          <ellipse cx="23.5" cy="14.5" rx="3" ry="1.5" fill="white" opacity="0.25" />
          <rect x="4.5" y="10.5" width="23" height="0.5" fill="white" opacity="0.4" />
        </>
      )}
    </svg>
  </motion.div>
);

export const Palm3D = ({ active }: { active: boolean }) => (
  <motion.div
    className="absolute inset-0 flex items-center justify-center"
    animate={active? {
      y: [0, -5, 0],
      scale: [1, 1.18, 1],
      rotateZ: [0, 4, -4, 3, 0],
      rotateY: [0, -5, 5, 0],
    } : { 
      y: 0, 
      scale: 0.9, 
      rotateZ: 0,
      rotateY: 0,
      opacity: 0.55
    }}
    transition={{
      duration: 1,
      ease: [0.34, 1.56, 0.64, 1],
      times: [0, 0.25, 0.5, 0.75, 1]
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

<svg viewBox="2 3 28 26" fill="none" className="w-full h-full">
      <defs>
        <radialGradient id="sun3D">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="10%" stopColor="#FFFDF5" />
          <stop offset="30%" stopColor="#FFF9D6" />
          <stop offset="50%" stopColor="#FFE066" />
          <stop offset="75%" stopColor="#FFD60A" />
          <stop offset="100%" stopColor="#FF9500" />
        </radialGradient>
        <linearGradient id="rayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD60A" stopOpacity="1" />
          <stop offset="30%" stopColor="#FFD60A" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#FFD60A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFD60A" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="cloudGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
        </radialGradient>
        <linearGradient id="island3D" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF9F0" />
          <stop offset="15%" stopColor="#FFF5E6" />
          <stop offset="35%" stopColor="#FFE4C4" />
          <stop offset="60%" stopColor="#FFD4A3" />
          <stop offset="85%" stopColor="#FFB366" />
          <stop offset="100%" stopColor="#FF9F40" />
        </linearGradient>
        <pattern id="sandPattern" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill="#FFC47D" opacity="0.8" />
          <circle cx="4" cy="2.5" r="0.5" fill="#FFB366" opacity="0.7" />
          <circle cx="2" cy="4.5" r="0.4" fill="#FFA54F" opacity="0.6" />
          <circle cx="5" cy="1.5" r="0.35" fill="#FF9638" opacity="0.5" />
          <circle cx="3" cy="3.5" r="0.3" fill="#FF8520" opacity="0.4" />
        </pattern>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5AC8FA" stopOpacity="0.7" />
          <stop offset="25%" stopColor="#4DB8F5" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#3AA8F0" stopOpacity="0.4" />
          <stop offset="75%" stopColor="#4DB8F5" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#5AC8FA" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="leaf3D" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4FFE0" />
          <stop offset="20%" stopColor="#B8FFC7" />
          <stop offset="40%" stopColor="#9FFFB0" />
          <stop offset="60%" stopColor="#7FE896" />
          <stop offset="80%" stopColor="#5BEB7B" />
          <stop offset="100%" stopColor="#30D158" />
        </linearGradient>
        <linearGradient id="trunk3D" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5A4435" />
          <stop offset="10%" stopColor="#6B5345" />
          <stop offset="25%" stopColor="#8B6F47" />
          <stop offset="40%" stopColor="#A67C52" />
          <stop offset="50%" stopColor="#C19A6B" />
          <stop offset="60%" stopColor="#A67C52" />
          <stop offset="75%" stopColor="#8B6F47" />
          <stop offset="90%" stopColor="#6B5345" />
          <stop offset="100%" stopColor="#5A4435" />
        </linearGradient>
      </defs>

      {active && (
        <motion.g
          animate={{ x: [-5, 35, -5] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        >
          <path d="M0 4L2 5L0 6" fill="#000" opacity="0.3" />
          <path d="M3 5L5 6L3 7" fill="#000000" opacity="0.3" />
        </motion.g>
      )}

      {active && (
        <motion.g
          animate={{ x: [-3, 3, -3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse cx="7" cy="4.5" rx="3" ry="1.5" fill="url(#cloudGrad)" opacity="0.8" />
          <ellipse cx="9.5" cy="5" rx="2.5" ry="1.2" fill="url(#cloudGrad)" opacity="0.7" />
          <ellipse cx="6" cy="5.2" rx="1.8" ry="1" fill="url(#cloudGrad)" opacity="0.6" />
        </motion.g>
      )}

      {active && (
        <g>
          <motion.g
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "24px 6.5px" }}
          >
            <line x1="24" y1="1" x2="24" y2="-0.5" stroke="url(#rayGrad)" strokeWidth="2.5" />
            <line x1="29.5" y1="6.5" x2="31.5" y2="6.5" stroke="url(#rayGrad)" strokeWidth="2.5" />
            <line x1="18.5" y1="6.5" x2="16.5" y2="6.5" stroke="url(#rayGrad)" strokeWidth="2.5" />
            <line x1="24" y1="12" x2="24" y2="14" stroke="url(#rayGrad)" strokeWidth="2.5" />
            <line x1="28" y1="2.5" x2="29.5" y2="1" stroke="url(#rayGrad)" strokeWidth="2" />
            <line x1="20" y1="2.5" x2="18.5" y2="1" stroke="url(#rayGrad)" strokeWidth="2" />
            <line x1="28" y1="10.5" x2="29.5" y2="12" stroke="url(#rayGrad)" strokeWidth="2" />
            <line x1="20" y1="10.5" x2="18.5" y2="12" stroke="url(#rayGrad)" strokeWidth="2" />
          </motion.g>
          <motion.circle
            cx="24" cy="6.5" r="4"
            fill="url(#sun3D)"
            animate={{
              scale: [1, 1.25, 1],
              opacity: [1, 0.85, 1]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle cx="24" cy="6.5" r="6" fill="#FFD60A" opacity="0.2" />
          <circle cx="24" cy="6.5" r="8" fill="#FFD60A" opacity="0.1" />
        </g>
      )}

      {/* Bỏ filter={active? "url(#palmShadow)" : "none"} */}
      <ellipse cx="16" cy="25.5" rx="11" ry="4.5" fill={active? "url(#island3D)" : "#E5E7EB"} />
      {active && (
        <>
          <ellipse cx="16" cy="25.5" rx="11" ry="4.5" fill="url(#sandPattern)" />
          <ellipse cx="16" cy="26.8" rx="9" ry="3" fill="#000000" opacity="0.15" />
          <ellipse cx="16" cy="24.2" rx="8" ry="2" fill="#FFFFFF" opacity="0.45" />
          <ellipse cx="10" cy="24.8" rx="1.5" ry="0.8" fill="#FFD4A3" opacity="0.8" />
          <ellipse cx="22" cy="26" rx="2.2" ry="0.9" fill="#FFD4A3" opacity="0.8" />
          <ellipse cx="16" cy="24.5" rx="1.8" ry="0.7" fill="#FFD4A3" opacity="0.7" />
          <ellipse cx="12" cy="25.8" rx="1" ry="0.5" fill="#FFC47D" opacity="0.6" />
          <ellipse cx="20" cy="25.2" rx="1.3" ry="0.6" fill="#FFC47D" opacity="0.6" />
          
          <motion.path
            d="M5 27C7 26.5 9 27 11 26.5C13 26 15 26.5 17 27C19 27.5 21 27 23 26.5C25 26 27 26.5 29 27"
            stroke="url(#waveGrad)"
            strokeWidth="2"
            fill="none"
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M5 28C7 27.5 9 28 11 27.5C13 27 15 27.5 17 28C19 28.5 21 28 23 27.5C25 27 27 28 29 28.5"
            stroke="url(#waveGrad)"
            strokeWidth="1.5"
            fill="none"
            opacity="0.7"
            animate={{ x: [0, -5, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M5 29C7 28.5 9 29 11 28.5C13 28 15 29 17 29.5C19 30 21 29.5 23 29C25 28.5 27 29 29 29.5"
            stroke="url(#waveGrad)"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      {active && (
        <g opacity="0.9">
          <ellipse cx="8.5" cy="22.5" rx="1.2" ry="1" fill="#8B6F47" />
          <ellipse cx="8.5" cy="21.5" rx="1" ry="0.8" fill="#6B5345" />
          <rect x="8.2" y="19.5" width="0.6" height="2.5" fill="#7FE896" />
          <motion.ellipse 
            cx="8.5" cy="18.5" rx="0.9" ry="0.5" fill="#5BEB7B" 
            transform="rotate(-15 8.5 18.5)"
            animate={{ rotate: [-15, -5, -15] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          
          <ellipse cx="23.5" cy="23.5" rx="1.2" ry="1" fill="#8B6F47" />
          <ellipse cx="23.5" cy="22.5" rx="1" ry="0.8" fill="#6B5345" />
          <rect x="23.2" y="20.5" width="0.6" height="2.5" fill="#7FE896" />
          <motion.ellipse 
            cx="23.5" cy="19.5" rx="0.9" ry="0.5" fill="#5BEB7B" 
            transform="rotate(15 23.5 19.5)"
            animate={{ rotate: [15, 5, 15] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />
          
          <ellipse cx="14" cy="23" rx="1" ry="0.8" fill="#8B6F47" />
          <ellipse cx="14" cy="22" rx="0.8" ry="0.6" fill="#6B5345" />
        </g>
      )}

      <g>
        <rect x="14.5" y="11.5" width="3" height="14" rx="1.5" fill={active? "url(#trunk3D)" : "#D1D5DB"} />
        {active && (
          <>
            <line x1="14.5" y1="14" x2="17.5" y2="14" stroke="#6B5345" strokeWidth="0.6" opacity="0.7" />
            <line x1="14.5" y1="16.5" x2="17.5" y2="16.5" stroke="#6B5345" strokeWidth="0.6" opacity="0.7" />
            <line x1="14.5" y1="19" x2="17.5" y2="19" stroke="#6B5345" strokeWidth="0.6" opacity="0.7" />
            <line x1="14.5" y1="21.5" x2="17.5" y2="21.5" stroke="#6B5345" strokeWidth="0.6" opacity="0.7" />
            <line x1="14.5" y1="24" x2="17.5" y2="24" stroke="#6B5345" strokeWidth="0.6" opacity="0.7" />
            <rect x="15.2" y="12" width="0.7" height="13" fill="#D4B896" opacity="0.8" rx="0.35" />
            <rect x="16.1" y="12" width="0.7" height="13" fill="#D4B896" opacity="0.6" rx="0.35" />
          </>
        )}
      </g>

      <g>
        <motion.ellipse
          cx="9.5" cy="11.5" rx="5.8" ry="2.8"
          fill={active? "url(#leaf3D)" : "#D1D5DB"}
          transform="rotate(-40 9.5 11.5)"
          animate={active? { rotate: [-40, -33, -40] } : {}}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        {active && (
          <>
            <line x1="9.5" y1="11.5" x2="4.5" y2="9" stroke="#1F8A3D" strokeWidth="0.9" opacity="0.8" transform="rotate(-40 9.5 11.5)" />
            <line x1="9.5" y1="11.5" x2="5.5" y2="12.5" stroke="#1F8A3D" strokeWidth="0.7" opacity="0.7" transform="rotate(-40 9.5 11.5)" />
            <line x1="9.5" y1="11.5" x2="6" y2="11" stroke="#1F8A3D" strokeWidth="0.6" opacity="0.6" transform="rotate(-40 9.5 11.5)" />
            <ellipse cx="8" cy="11" rx="2.2" ry="1.1" fill="white" opacity="0.6" transform="rotate(-40 8 11)" />
            <ellipse cx="7" cy="10.5" rx="1.5" ry="0.8" fill="white" opacity="0.4" transform="rotate(-40 7 10.5)" />
          </>
        )}
      </g>

      <g>
        <motion.ellipse
          cx="22.5" cy="11.5" rx="5.8" ry="2.8"
          fill={active? "url(#leaf3D)" : "#D1D5DB"}
          transform="rotate(40 22.5 11.5)"
          animate={active? { rotate: [40, 33, 40] } : {}}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        {active && (
          <>
            <line x1="22.5" y1="11.5" x2="27.5" y2="9" stroke="#1F8A3D" strokeWidth="0.9" opacity="0.8" transform="rotate(40 22.5 11.5)" />
            <line x1="22.5" y1="11.5" x2="26.5" y2="12.5" stroke="#1F8A3D" strokeWidth="0.7" opacity="0.7" transform="rotate(40 22.5 11.5)" />
            <line x1="22.5" y1="11.5" x2="26" y2="11" stroke="#1F8A3D" strokeWidth="0.6" opacity="0.6" transform="rotate(40 22.5 11.5)" />
            <ellipse cx="24" cy="11" rx="2.2" ry="1.1" fill="white" opacity="0.6" transform="rotate(40 24 11)" />
            <ellipse cx="25" cy="10.5" rx="1.5" ry="0.8" fill="white" opacity="0.4" transform="rotate(40 25 10.5)" />
          </>
        )}
      </g>

      <g>
        <motion.ellipse
          cx="16" cy="8" rx="4.2" ry="3.5"
          fill={active? "url(#leaf3D)" : "#D1D5DB"}
          animate={active? { scaleY: [1, 1.18, 1] } : {}}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {active && (
          <>
            <line x1="16" y1="8" x2="16" y2="4.5" stroke="#1F8A3D" strokeWidth="1" opacity="0.8" />
            <line x1="16" y1="8" x2="13.5" y2="5.5" stroke="#1F8A3D" strokeWidth="0.8" opacity="0.7" />
            <line x1="16" y1="8" x2="18.5" y2="5.5" stroke="#1F8A3D" strokeWidth="0.8" opacity="0.7" />
            <line x1="16" y1="8" x2="14" y2="6.5" stroke="#1F8A3D" strokeWidth="0.7" opacity="0.6" />
            <line x1="16" y1="8" x2="18" y2="6.5" stroke="#1F8A3D" strokeWidth="0.7" opacity="0.6" />
            <ellipse cx="16" cy="7" rx="1.8" ry="1.4" fill="white" opacity="0.6" />
            <ellipse cx="14.5" cy="7.5" rx="1" ry="0.8" fill="white" opacity="0.4" />
            <ellipse cx="17.5" cy="7.5" rx="1" ry="0.8" fill="white" opacity="0.4" />
          </>
        )}
      </g>

      {active && <ellipse cx="16" cy="27.5" rx="7" ry="1.8" fill="#000000" opacity="0.2" />}
    </svg>
  </motion.div>
);