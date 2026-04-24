"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Smile } from "lucide-react";

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

  // preventDefault + stopPropagation để không trigger parent
  const toggleOpen = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  }, [open]);

  const handleSelect = useCallback((e: React.MouseEvent, emoji: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(emoji);
    setOpen(false);
  }, [onSelect]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition active:scale-90"
        aria-label="Chọn emoji"
      >
        <Smile size={20} className="text-gray-500 dark:text-zinc-400" />
      </button>

      {open && (
        <div
          className={`absolute bottom-full mb-2 p-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 grid grid-cols-5 gap-1 z-50 w-64 ${
            align === "right"? "right-0" : "left-0"
          }`}
        >
          {EMOJI_LIST.map((e) => (
            <button
              key={e}
              onClick={(ev) => handleSelect(ev, e)}
              className="text-2xl p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition active:scale-90"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}