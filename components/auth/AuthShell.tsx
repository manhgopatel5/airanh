"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { FiShield, FiZap } from "react-icons/fi";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
};

export default function AuthShell({
  eyebrow = "AIR",
  title,
  description,
  children,
  footer,
  icon,
  className,
}: AuthShellProps) {
  const reduceMotion = useReducedMotion();

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(10,132,255,0.18),transparent_32%),radial-gradient(circle_at_88%_20%,rgba(48,209,88,0.14),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_48%,#f4f7fb_100%)] px-4 py-8 text-zinc-950 dark:bg-[radial-gradient(circle_at_20%_10%,rgba(10,132,255,0.24),transparent_32%),radial-gradient(circle_at_88%_20%,rgba(48,209,88,0.16),transparent_28%),linear-gradient(180deg,#05070a_0%,#09090b_52%,#0f172a_100%)] dark:text-white sm:px-6">
      <div className="pointer-events-none absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent dark:via-sky-400/30" />
      <div className="pointer-events-none absolute -left-24 top-24 h-52 w-52 rounded-full bg-sky-400/15 blur-3xl dark:bg-sky-500/10" />
      <div className="pointer-events-none absolute -right-20 bottom-20 h-56 w-56 rounded-full bg-emerald-400/12 blur-3xl dark:bg-emerald-500/10" />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className={cn("relative z-10 w-full max-w-[430px]", className)}
      >
        <div className="mb-5 flex items-center justify-between px-1">
          <Link href="/" className="group inline-flex items-center gap-3" aria-label="AIR home">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-[#0A84FF] to-[#0051D5] text-lg font-black text-white shadow-xl shadow-sky-500/30 ring-1 ring-white/50">
              A
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-zinc-950" />
            </span>
            <span>
              <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-sky-500 dark:text-sky-300">{eyebrow}</span>
              <span className="block text-sm font-bold text-zinc-500 dark:text-zinc-400">Kết nối việc nhanh</span>
            </span>
          </Link>
          <div className="flex h-10 items-center gap-1.5 rounded-full bg-white/72 px-3 text-xs font-bold text-zinc-500 shadow-sm ring-1 ring-black/5 backdrop-blur-xl dark:bg-white/8 dark:text-zinc-300 dark:ring-white/10">
            <FiShield className="h-3.5 w-3.5 text-emerald-500" />
            Bảo mật
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/75 bg-white/82 p-5 shadow-2xl shadow-sky-950/[0.08] ring-1 ring-black/[0.03] backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/72 dark:shadow-black/35 dark:ring-white/10 sm:p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.35rem] bg-sky-50 text-sky-600 ring-1 ring-sky-500/10 dark:bg-sky-500/12 dark:text-sky-300">
              {icon || <FiZap className="h-6 w-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-3xl">{title}</h1>
              {description && (
                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
              )}
            </div>
          </div>

          {children}
        </div>

        {footer && <div className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">{footer}</div>}
      </motion.section>
    </main>
  );
}
