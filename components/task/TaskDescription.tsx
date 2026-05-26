"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Linkify from "linkify-react";

type Props = {
  description?: string;
  images?: string[];
  onImageClick: (index: number) => void;
};

export default function TaskDescription({ description, images, onImageClick }: Props) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [showDescMore, setShowDescMore] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (descRef.current) {
      const el = descRef.current;
      setShowDescMore(el.scrollHeight > el.clientHeight);
    }
  }, [description]);

  if (!description && (!images || images.length === 0)) return null;

  return (
    <>
      {description && (
        <>
          <div className="h-px bg-[#E5E5EA] dark:bg-zinc-800 w-screen -ml-3 my-4" />
          <h3 className="font-semibold text-[15px] text-[#1C1C1E] dark:text-zinc-100 mb-2">
            Mô tả công việc
          </h3>
          <Linkify options={{ target: "_blank", className: `text-[#0A84FF] hover:underline` }}>
            <p
              ref={descRef}
              className={`text-[15px] text-[#1C1C1E] dark:text-zinc-100 whitespace-pre-wrap leading-relaxed ${
               !descExpanded? 'line-clamp-5' : ''
              }`}
            >
              {description}
            </p>
          </Linkify>
          {showDescMore && (
            <div className="text-center">
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-[15px] font-semibold text-[#0A84FF] mt-1 active:opacity-60"
              >
                {descExpanded? 'Thu gọn' : 'Xem thêm mô tả'}
              </button>
            </div>
          )}
        </>
      )}

      {images && images.length > 0 && (
        <>
          <div className="h-px bg-[#E5E5EA] dark:bg-zinc-800 w-screen -ml-3 my-4" />
          <h3 className="font-semibold text-[15px] text-[#1C1C1E] dark:text-zinc-100 mb-2">
            Xem ảnh và file
          </h3>
          <div className="px-4 pt-0 pb-2">
            {images.length === 1? (
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => onImageClick(0)}
                className="relative w-20 h-20 rounded-xl overflow-hidden"
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
                    onClick={() => onImageClick(i)}
                    className="relative w-20 h-20 rounded-xl overflow-hidden"
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
                    onClick={() => onImageClick(i)}
                    className="relative aspect-square rounded-xl overflow-hidden"
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
                        <span className="text-white font-bold text-[15px]">
                          +{images.length - 3}
                        </span>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}