"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Linkify from "linkify-react";

type Props = {
  description?: string;
  images?: string[];
  onImageClick: (index: number) => void;
  theme?: "task" | "plan";
};

export default function TaskDescription({
  description,
  images,
  onImageClick,
  theme = "task"
}: Props) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [showDescMore, setShowDescMore] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  const accentColor = theme === "task"? "#0A84FF" : "#30D158";

  useEffect(() => {
    if (descRef.current) {
      const el = descRef.current;
      setShowDescMore(el.scrollHeight > el.clientHeight);
    }
  }, [description]);

  if (!description && (!images || images.length === 0)) return null;

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
      {description && (
        <>
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-2">
            Mô tả công việc
          </h3>
          <Linkify
            options={{
              target: "_blank",
              className: `text-[${accentColor}] hover:underline font-medium`
            }}
          >
            <p
              ref={descRef}
              className={`text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed ${
             !descExpanded? 'line-clamp-5' : ''
              }`}
            >
              {description}
            </p>
          </Linkify>
          {showDescMore && (
            <div className="text-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setDescExpanded(!descExpanded);
                  navigator.vibrate?.(5);
                }}
                className="text-sm font-semibold mt-2 active:opacity-60 transition-opacity"
                style={{ color: accentColor }}
              >
                {descExpanded? 'Thu gọn' : 'Xem thêm mô tả'}
              </motion.button>
            </div>
          )}
        </>
      )}

      {images && images.length > 0 && (
        <div className={description? "mt-6" : ""}>
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-3">
            Xem ảnh và file
          </h3>
          <div className="pt-0 pb-2">
            {images.length === 1? (
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  onImageClick(0);
                  navigator.vibrate?.(5);
                }}
                className="relative w-20 h-20 rounded-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
              >
                <Image
                  src={images[0]!}
                  alt="Ảnh đính kèm"
                  fill
                  sizes="80px"
                  className="object-cover"
                  priority
                />
              </motion.button>
            ) : images.length === 2? (
              <div className="flex gap-2">
                {images.slice(0, 2).map((img, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      onImageClick(i);
                      navigator.vibrate?.(5);
                    }}
                    className="relative w-20 h-20 rounded-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
                  >
                    <Image
                      src={img!}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                      priority={i === 0}
                    />
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-w-[264px]">
                {images.slice(0, 3).map((img, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      onImageClick(i);
                      navigator.vibrate?.(5);
                    }}
                    className="relative aspect-square rounded-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
                  >
                    <Image
                      src={img!}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                      priority={i === 0}
                    />
                    {i === 2 && images.length > 3 && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          +{images.length - 3}
                        </span>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}