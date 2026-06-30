"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import MarkdownContent from "@/components/common/MarkdownContent";

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
  const descRef = useRef<HTMLDivElement>(null);

  const accentColor = theme === "task" ? "#0A84FF" : "#30D158";
  const label = theme === "task" ? "Mô tả công việc" : "Mô tả sự kiện";

  useEffect(() => {
    if (descRef.current) {
      const el = descRef.current;
      setShowDescMore(el.scrollHeight > el.clientHeight);
    }
  }, [description, descExpanded]);

  if (!description && (!images || images.length === 0)) return null;

  return (
    <>
      <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-screen -ml-4 my-4" />

      <div className="pb-4">
        {description && (
          <>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 leading-5 mb-2">
              {label}
            </h3>
            <div
              ref={descRef}
              className={!descExpanded ? "line-clamp-5 overflow-hidden" : ""}
            >
              <MarkdownContent content={description} theme={theme} />
            </div>
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
                  {descExpanded ? "Thu gọn" : "Xem thêm mô tả"}
                </motion.button>
              </div>
            )}
          </>
        )}

        {images && images.length > 0 && (
          <div className={description ? "mt-6" : ""}>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 mb-3">
              Xem ảnh và file
            </h3>
            <div className="pt-0">
              {images.length === 1 ? (
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
                    loading="lazy"
                  />
                </motion.button>
              ) : images.length === 2 ? (
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
                        loading="lazy"
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
                        loading="lazy"
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
    </>
  );
}
