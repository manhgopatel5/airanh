"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Crown, Sparkles, Zap, ChevronRight } from "lucide-react";
import {
  HUHA_LEVEL_TIERS,
  HUHA_XP_SOURCES,
  formatXpRange,
  summarizeLevel,
} from "@/lib/huhaLevel";
import { useAppStore } from "@/store/app";
import { useEffect } from "react";

type HuhaLevelModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  huhaScore: number;
  isOwnProfile?: boolean;
  onNavigate?: (href: string) => void;
};

export default function HuhaLevelModal({
  open,
  onOpenChange,
  huhaScore,
  isOwnProfile,
  onNavigate,
}: HuhaLevelModalProps) {
  const setHideTabBar = useAppStore((s) => s.setHideTabBar);
  const summary = summarizeLevel(huhaScore);

  useEffect(() => {
    setHideTabBar(open);
    return () => setHideTabBar(false);
  }, [open, setHideTabBar]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl p-5 z-[90] shadow-2xl">
          <Dialog.Title className="text-xl font-bold text-zinc-900 mb-1 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Cấp HuHa
          </Dialog.Title>
          <p className="text-sm text-zinc-500 mb-4">
            Hệ thống cấp độ dựa trên tổng XP tích lũy từ hoạt động thực tế.
          </p>

          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 text-white mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm opacity-90">{summary.tier.name}</p>
                <p className="text-2xl font-black">Lv.{summary.level}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Tổng XP</p>
                <p className="text-xl font-bold">{summary.huhaScore}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1 opacity-90">
                <span>Tiến trình cấp hiện tại</span>
                <span>
                  {summary.currentExp}/{summary.nextLevelExp} XP
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/30 overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${summary.progress}%` }} />
              </div>
            </div>
          </div>

          <div className="mb-4 p-4 rounded-2xl bg-blue-50 border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Cách nhận XP
            </p>
            <div className="space-y-1.5">
              {HUHA_XP_SOURCES.map((src) => (
                <div key={src.label} className="flex justify-between text-sm text-blue-800">
                  <span>{src.label}</span>
                  <span className="font-semibold">
                    +{src.xp}
                    {"note" in src ? ` (${src.note})` : ""}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Mỗi cấp cần <b>100 × level^1.5</b> XP (cấp càng cao càng khó lên).
            </p>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Các hạng</p>
          <div className="space-y-2 mb-4">
            {HUHA_LEVEL_TIERS.map((tier) => {
              const active = summary.level >= tier.minLevel && summary.level <= tier.maxLevel;
              return (
                <div
                  key={tier.name}
                  className={`p-3 rounded-2xl border ${
                    active ? "border-blue-300 bg-blue-50" : "border-zinc-200 bg-zinc-50 opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-r ${tier.gradient} text-white flex items-center justify-center shrink-0`}
                      >
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-zinc-900">{tier.name}</p>
                        <p className="text-xs text-zinc-500">
                          Lv.{tier.minLevel}
                          {tier.maxLevel < 999 ? `–${tier.maxLevel}` : "+"}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-zinc-600 shrink-0">{formatXpRange(tier)} XP</p>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1.5">{tier.perks}</p>
                </div>
              );
            })}
          </div>

          {isOwnProfile && onNavigate && (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onNavigate("/?tab=tasks");
              }}
              className="w-full mb-3 p-3 rounded-2xl bg-zinc-100 text-left flex items-center justify-between active:scale-[0.98]"
            >
              <span className="text-sm font-semibold text-zinc-800">Xem task để kiếm thêm XP</span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
          )}

          <Dialog.Close className="w-full h-12 rounded-2xl bg-zinc-900 text-white font-semibold active:scale-[0.98]">
            Đã hiểu
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
