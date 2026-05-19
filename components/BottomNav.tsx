"use client";

import { useRouter, usePathname } from "next/navigation";
import { FiMessageSquare, FiClipboard, FiUser } from "react-icons/fi";
import { HiHome, HiPlus } from "react-icons/hi2";
import { useEffect, useTransition, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";

  useEffect(() => {
    [
      "/",
      "/messages",
      "/tasks",
      "/profile",
      "/create/task",
      "/create/plan",
    ].forEach((p) => router.prefetch(p));
  }, [router]);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = useCallback(
    (path: string) => {
      if (pathname === path) return;

      navigator.vibrate?.(8);

      startTransition(() => router.push(path));
    },
    [pathname, router]
  );

  const choose = (t: "task" | "plan") => {
    navigator.vibrate?.([8, 12]);

    setOpen(false);

    setTimeout(() => {
      go(`/create/${t}`);
    }, 180);
  };

  const isActive = (p: string) =>
    p === "/" ? pathname === "/" : pathname.startsWith(p);

  const activeColor = isPlan
    ? "text-[#10B981]"
    : "text-[#0A84FF]";

  return (
    <>
      {/* NAV */}
      <nav className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-[480px] px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto relative overflow-hidden rounded-[30px] border border-white/40 bg-white/75 backdrop-blur-3xl shadow-[0_10px_40px_rgba(0,0,0,0.12)]">

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffff,#f5f8ff_45%,#edf2ff)]" />

            <div className="relative flex items-center h-[70px] px-2">

              {[
                {
                  p: "/",
                  Icon: HiHome,
                },
                {
                  p: "/messages",
                  Icon: FiMessageSquare,
                },
              ].map((x) => (
                <button
                  key={x.p}
                  onClick={() => go(x.p)}
                  className="flex-1 flex items-center justify-center active:scale-95 transition"
                >
                  <x.Icon
                    className={`w-[23px] h-[23px] ${
                      isActive(x.p)
                        ? activeColor
                        : "text-zinc-400"
                    }`}
                    strokeWidth={isActive(x.p) ? 2.4 : 1.9}
                  />
                </button>
              ))}

              {/* PLUS */}
              <div className="w-[82px] flex justify-center">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => setOpen(true)}
                  className="relative -mt-7"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1],
                      opacity: [0.4, 0.7, 0.4],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                    }}
                    className={`absolute inset-0 rounded-full blur-2xl ${
                      isPlan
                        ? "bg-[#10B981]"
                        : "bg-[#0A84FF]"
                    }`}
                  />

                  <div
                    className={`relative w-[64px] h-[64px] rounded-full flex items-center justify-center shadow-[0_12px_30px_rgba(0,0,0,0.18)] ring-4 ring-white ${
                      isPlan
                        ? "bg-gradient-to-b from-[#1FD38D] to-[#0A9E5F]"
                        : "bg-gradient-to-b from-[#38A1FF] to-[#0066FF]"
                    }`}
                  >
                    <HiPlus className="w-7 h-7 text-white" />
                  </div>
                </motion.button>
              </div>

              {[
                {
                  p: "/tasks",
                  Icon: FiClipboard,
                },
                {
                  p: "/profile",
                  Icon: FiUser,
                },
              ].map((x) => (
                <button
                  key={x.p}
                  onClick={() => go(x.p)}
                  className="flex-1 flex items-center justify-center active:scale-95 transition"
                >
                  <x.Icon
                    className={`w-[23px] h-[23px] ${
                      isActive(x.p)
                        ? activeColor
                        : "text-zinc-400"
                    }`}
                    strokeWidth={isActive(x.p) ? 2.4 : 1.9}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* MODAL */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
          >
            {/* BG */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/35 backdrop-blur-xl"
            />

            {/* SHEET */}
            <motion.div
              initial={{ y: 120 }}
              animate={{ y: 0 }}
              exit={{ y: 120 }}
              transition={{
                type: "spring",
                damping: 24,
                stiffness: 220,
              }}
              className="absolute inset-x-0 bottom-0 flex justify-center"
            >
              <div className="w-full max-w-[480px] rounded-t-[38px] border border-white/30 bg-[radial-gradient(circle_at_top,#ffffff,#f8fbff_40%,#eef4ff)] backdrop-blur-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)] overflow-hidden">

                <div className="w-11 h-1.5 rounded-full bg-zinc-300 mx-auto mt-3" />

                <div className="px-6 pt-5 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-[30px] font-black tracking-tight text-slate-900">
                      Create
                    </h2>
                  </div>

                  <button
                    onClick={() => setOpen(false)}
                    className="w-9 h-9 rounded-full bg-white/80 border border-zinc-100 shadow-sm flex items-center justify-center text-zinc-500"
                  >
                    ✕
                  </button>
                </div>

                <div className="px-4 pb-8 grid grid-cols-2 gap-4">

                  {/* TASK */}
                  <motion.button
                    whileHover={{
                      y: -4,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                    onClick={() => choose("task")}
                    className="relative overflow-hidden rounded-[34px] border border-[#D7E8FF] bg-gradient-to-b from-[#EEF6FF] to-[#DCEBFF] pt-7 pb-6"
                  >
                    {/* glow */}
                    <motion.div
                      animate={{
                        opacity: [0.2, 0.5, 0.2],
                        scale: [1, 1.12, 1],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                      }}
                      className="absolute right-4 top-4 w-32 h-32 rounded-full bg-blue-300 blur-3xl"
                    />

                    {/* rocket */}
                    <motion.div
                      animate={{
                        y: [0, -12, 0],
                        rotate: [-2, 2, -2],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="relative z-10"
                    >
                      <img
                        src="/images/task-rocket.png"
                        alt=""
                        className="w-[170px] mx-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
                      />
                    </motion.div>

                    <div className="relative z-10 mt-2">
                      <h3 className="text-[22px] font-black text-[#0066FF]">
                        Task
                      </h3>
                    </div>

                    <motion.div
                      animate={{
                        x: [0, 6, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                      className="relative z-10 mt-5 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center mx-auto"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0066FF"
                        strokeWidth="2.5"
                      >
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  </motion.button>

                  {/* PLAN */}
                  <motion.button
                    whileHover={{
                      y: -4,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                    onClick={() => choose("plan")}
                    className="relative overflow-hidden rounded-[34px] border border-[#CBEAD8] bg-gradient-to-b from-[#EDFFF5] to-[#DCF5E7] pt-7 pb-6"
                  >
                    {/* glow */}
                    <motion.div
                      animate={{
                        opacity: [0.2, 0.5, 0.2],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                      }}
                      className="absolute left-2 top-6 w-32 h-32 rounded-full bg-green-300 blur-3xl"
                    />

                    {/* balloon */}
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                        rotate: [-2, 2, -2],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="relative z-10"
                    >
                      <img
                        src="/images/plan-balloon.png"
                        alt=""
                        className="w-[170px] mx-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.16)]"
                      />
                    </motion.div>

                    <div className="relative z-10 mt-2">
                      <h3 className="text-[22px] font-black text-[#059669]">
                        Plan
                      </h3>
                    </div>

                    <motion.div
                      animate={{
                        x: [0, 6, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                      className="relative z-10 mt-5 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center mx-auto"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="2.5"
                      >
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}