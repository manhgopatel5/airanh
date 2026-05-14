"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";

const EMOJI_LIST = [
  "😀", "😂", "😍", "🤔", "😭", "😡", "👍", "👎", "❤️", "🔥",
  "💯", "🎉", "😎", "🤯", "🙏", "👀", "💀", "🤡", "😴", "🥳"
];

type Props = {
  onSelect: (emoji: string) => void;
  align?: "left" | "right";
};

export default function EmojiPicker({ onSelect, align = "left" }: Props) {
  const [open, setOpen] = useState(false);
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current &&!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggleOpen = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
    navigator.vibrate?.(5);
  }, [open]);

  const handleSelect = useCallback((e: React.MouseEvent, emoji: string) => {
    e.preventDefault();
    e.stopPropagation();
    setBurstEmoji(emoji);
    navigator.vibrate?.([5,10,5]);
    setTimeout(() => {
      onSelect(emoji);
      setOpen(false);
      setBurstEmoji(null);
    }, 180);
  }, [onSelect]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-90 relative"
        aria-label="Chọn emoji"
      >
        <Smile size={20} className="text-zinc-500 dark:text-zinc-400 group-hover:text-[#0042B2] transition-colors" />
        {/* Burst khi chọn */}
        <AnimatePresence>
  {burstEmoji && (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.8, opacity: 0 }}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
    >
      <div className="relative w-16 h-16 flex items-center justify-center">
        <LottiePlayer
          animationData={celebrate}
          autoplay
          loop={false}
          className="w-16 h-16 absolute"
        />

        <motion.span
          initial={{ scale: 0.5 }}
          animate={{ scale: 1.3 }}
          className="text-2xl relative z-10"
        >
          {burstEmoji}
        </motion.span>
      </div>
    </motion.div>
  )}
</AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{opacity:0,scale:0.9,y:8}}
            animate={{opacity:1,scale:1,y:0}}
            exit={{opacity:0,scale:0.9,y:8}}
            transition={{type:"spring",damping:22,stiffness:320}}
            className={`absolute bottom-full mb-2 p-2.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800 grid grid-cols-5 gap-1 z-50 w-64 ${
             align === "right"? "right-0" : "left-0"
            }`}
          >
            {EMOJI_LIST.map((e) => (
              <motion.button
                key={e}
                whileHover={{scale:1.15}}
                whileTap={{scale:0.85}}
                onClick={(ev) => handleSelect(ev, e)}
                className="text-2xl p-2.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition relative"
              >
                {e}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}