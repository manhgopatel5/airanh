"use client";

import { useState, memo } from "react";
import LottiePlayer from "@/components/LottiePlayer";
import * as L from "@/components/illustrations";

type Item = {
  key: string;
  label: string;
  data: object;
  loop: boolean;
};

const items: Item[] = [
  { key: "empty", label: "Empty state", data: L.empty, loop: true },
  { key: "idle", label: "Idle", data: L.idle, loop: true },
  { key: "loadingPull", label: "Loading", data: L.loadingPull, loop: true },
  { key: "searching", label: "Searching", data: L.searching, loop: true },
  { key: "noWifi", label: "No wifi", data: L.noWifi, loop: true },
  { key: "errorShake", label: "Error", data: L.errorShake, loop: false },
  { key: "successCheck", label: "Success", data: L.successCheck, loop: false },
  { key: "celebrate", label: "Celebrate", data: L.celebrate, loop: false },
  { key: "coinDrop", label: "Coin drop", data: L.coinDrop, loop: false },
  { key: "walletOpen", label: "Wallet", data: L.walletOpen, loop: false },
  { key: "switchToggle", label: "Switch", data: L.switchToggle, loop: false },
  { key: "task", label: "Task", data: L.task, loop: false },
  { key: "plan", label: "Plan", data: L.plan, loop: false },
];

const LottieCard = memo(({ it, speed, hoverPlay }: { it: Item; speed: number; hoverPlay: boolean }) => (
  <div
    key={it.key}
    className="group relative flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#0042B2]/40 hover:bg-white hover:shadow-sm"
  >
    <div className="flex h-28 w-28 items-center justify-center">
      <LottiePlayer
        animationData={it.data}
        loop={it.loop}
        autoplay={it.loop}
        playOnHover={hoverPlay && !it.loop}
        speed={speed}
        className="h-24 w-24"
        aria-label={it.label}
      />
    </div>
    <div className="mt-2 text-center">
      <div className="text-sm font-medium text-slate-800">{it.label}</div>
      <div className="text-xs text-slate-500">huha-{it.key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}.json</div>
    </div>
  </div>
));

LottieCard.displayName = "LottieCard";

export default function LottiesPage() {
  const [speed, setSpeed] = useState(1);
  const [hoverPlay, setHoverPlay] = useState(true);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">HUHA Lotties</h1>
          <div className="flex items-center gap-4 text-sm text-zinc-700 dark:text-zinc-300">
            <label className="flex items-center gap-2">
              <span>Speed</span>
              <input 
                type="range" 
                min={0.5} 
                max={2} 
                step={0.1} 
                value={speed} 
                onChange={(e) => setSpeed(Number(e.target.value))}
                suppressHydrationWarning
                className="accent-[#0042B2]"
              />
              <span className="w-8 tabular-nums">{speed.toFixed(1)}x</span>
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={hoverPlay} 
                onChange={(e) => setHoverPlay(e.target.checked)}
                className="accent-[#0042B2]"
              />
              <span>Play on hover</span>
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((it) => (
            <LottieCard key={it.key} it={it} speed={speed} hoverPlay={hoverPlay} />
          ))}
        </div>
      </main>
    </div>
  );
}