"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FiChevronLeft, FiX, FiZoomIn, FiZoomOut } from "react-icons/fi";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
};

export function ImageGallery({ open, images, initialIndex, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [scale, setScale] = useState(1);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const lastTapRef = useRef(0);
  const hideUITimeoutRef = useRef<NodeJS.Timeout>();

  // Reset khi đổi ảnh hoặc đóng
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
    setScale(1);
    x.set(0);
    y.set(0);
  }, [initialIndex, open, x, y]);

  // Preload ảnh trước/sau
  useEffect(() => {
    if (!open) return;
const preload = (idx: number) => {
  if (idx >= 0 && idx < images.length) {
    const src = images[idx];
    if (src) {
      const img = new Image();
      img.src = src;
    }
  }
};
    preload(currentIndex + 1);
    preload(currentIndex - 1);
  }, [currentIndex, images, open]);

  // Auto hide UI
  useEffect(() => {
    if (!showUI) return;
    if (hideUITimeoutRef.current) clearTimeout(hideUITimeoutRef.current);
    hideUITimeoutRef.current = setTimeout(() => setShowUI(false), 3000);
    return () => {
      if (hideUITimeoutRef.current) clearTimeout(hideUITimeoutRef.current);
    };
  }, [showUI, currentIndex]);

  const paginate = (newDirection: number) => {
    if (isZoomed) return;
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      const next = prev + newDirection;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
    setShowUI(true);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      toggleZoom();
    }
    lastTapRef.current = now;
  };

  const toggleZoom = () => {
    if (isZoomed) {
      setScale(1);
      x.set(0);
      y.set(0);
      setIsZoomed(false);
    } else {
      setScale(2.5);
      setIsZoomed(true);
    }
    setShowUI(true);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      zIndex: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0? 1000 : -1000,
      opacity: 0,
      zIndex: 0,
    }),
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowLeft") paginate(-1);
      if (e.key === "ArrowRight") paginate(1);
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(s + 0.5, 4));
      if (e.key === "-") setScale((s) => Math.max(s - 0.5, 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, isZoomed]);

  if (!images.length) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full w-screen h-screen bg-black border-0 p-0 overflow-hidden">
        {/* UI Overlay */}
        <AnimatePresence>
          {showUI && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 pointer-events-none"
            >
              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-auto">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                  <div className="px-3 py-1.5 bg-black/50 backdrop-blur-xl text-white text- rounded-full tabular-nums">
                    {currentIndex + 1} / {images.length}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={toggleZoom}
                      className="p-2.5 bg-black/50 backdrop-blur-xl hover:bg-black/70 text-white rounded-full active:scale-90 transition-all"
                    >
                      {isZoomed? <FiZoomOut size={20} /> : <FiZoomIn size={20} />}
                    </button>
                    <button
                      onClick={onClose}
                      className="p-2.5 bg-black/50 backdrop-blur-xl hover:bg-black/70 text-white rounded-full active:scale-90 transition-all"
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Nav buttons */}
              {images.length > 1 &&!isZoomed && (
                <>
                  <button
                    onClick={() => paginate(-1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-xl hover:bg-black/70 text-white rounded-full active:scale-90 transition-all pointer-events-auto"
                  >
                    <FiChevronLeft size={24} />
                  </button>
                  <button
                    onClick={() => paginate(1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-xl hover:bg-black/70 text-white rounded-full active:scale-90 transition-all pointer-events-auto"
                  >
                    <FiChevronLeft size={24} className="rotate-180" />
                  </button>
                </>
              )}

              {/* Thumbnail bar */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-full px-4 pointer-events-auto">
                  <div className="flex gap-2 p-2 bg-black/50 backdrop-blur-xl rounded-2xl overflow-x-auto scrollbar-hide">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setDirection(idx > currentIndex? 1 : -1);
                          setCurrentIndex(idx);
                          setShowUI(true);
                        }}
                        className={cn(
                          "relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all",
                          idx === currentIndex
                           ? "ring-2 ring-white scale-110"
                            : "opacity-50 hover:opacity-100"
                        )}
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image container */}
        <div
          className="relative w-full h-full flex items-center justify-center"
          onClick={() => setShowUI(!showUI)}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.img
                ref={imgRef}
                src={images[currentIndex]}
                alt=""
                drag={isZoomed? true : "x"}
                dragConstraints={isZoomed? { left: -200, right: 200, top: -200, bottom: 200 } : { left: 0, right: 0 }}
                dragElastic={isZoomed? 0.2 : 1}
                onDragEnd={(_, { offset, velocity }) => {
                  if (isZoomed) return;
                  const swipe = Math.abs(offset.x) * velocity.x;
                  if (swipe < -10000) paginate(1);
                  else if (swipe > 10000) paginate(-1);
                }}
                onTap={handleDoubleTap}
                animate={{ scale }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="max-w-full max-h-full object-contain select-none"
                style={{ x, y }}
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}