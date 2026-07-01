"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Lock } from "lucide-react";
import {
  evaluateAchievements,
  getAchievementColor,
  getAchievementGradientHex,
  type EvaluatedAchievement,
} from "@/lib/achievements";
import { buildGamificationUser, type GamificationUser } from "@/lib/gamification";
import { AchievementIcon } from "@/components/achievements/AchievementIcon";
import { useAppStore } from "@/store/app";
import HuhaLevelModal from "@/components/profile/HuhaLevelModal";
import { summarizeLevel } from "@/lib/huhaLevel";
import { Crown } from "lucide-react";

type AchievementsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gamUser: GamificationUser;
};

function AchievementBadge({
  item,
  size = "md",
  onClick,
}: {
  item: EvaluatedAchievement;
  size?: "sm" | "md";
  onClick?: () => void;
}) {
  const colors = getAchievementColor(item.id);
  const dim = size === "sm" ? "w-14 h-14" : "w-16 h-16";

  const inner = (
    <div
      className={`${dim} rounded-2xl flex items-center justify-center mb-1.5 ${
        item.unlocked
          ? `bg-gradient-to-br ${colors.gradient} shadow-md`
          : "bg-zinc-100 border-2 border-dashed border-zinc-300"
      }`}
    >
      <div className={item.unlocked ? "text-white" : "text-zinc-400"}>
        {item.unlocked ? (
          <AchievementIcon name={item.iconName} className="w-5 h-5" />
        ) : (
          <Lock className="w-4 h-4" />
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="flex flex-col items-center active:scale-95 transition-all">
        {inner}
        <p className="text-xs font-semibold text-zinc-700 text-center leading-tight line-clamp-2">{item.label}</p>
      </button>
    );
  }

  const [from, to] = getAchievementGradientHex(item.id);
  return (
    <div className="flex flex-col items-center">
      <div
        className={`${dim} rounded-2xl flex items-center justify-center shadow-lg`}
        style={{
          background: item.unlocked ? `linear-gradient(135deg, ${from}, ${to})` : "#F4F4F5",
        }}
      >
        <div className={item.unlocked ? "text-white" : "text-zinc-400"}>
          <AchievementIcon name={item.iconName} className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function AchievementsModal({ open, onOpenChange, gamUser }: AchievementsModalProps) {
  const allAchievements = evaluateAchievements(gamUser);
  const unlockedCount = allAchievements.filter((a) => a.unlocked).length;

  return (
    <AchievementsModalInner
      open={open}
      onOpenChange={onOpenChange}
      allAchievements={allAchievements}
      unlockedCount={unlockedCount}
      gamUser={gamUser}
    />
  );
}

export function AchievementsModalFromUser({
  open,
  onOpenChange,
  userData,
  uid,
  friendCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData: Record<string, unknown>;
  uid: string;
  friendCount?: number;
}) {
  const gamUser = buildGamificationUser(userData, uid, friendCount);
  return <AchievementsModal open={open} onOpenChange={onOpenChange} gamUser={gamUser} />;
}

function AchievementsModalInner({
  open,
  onOpenChange,
  allAchievements,
  unlockedCount,
  gamUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allAchievements: EvaluatedAchievement[];
  unlockedCount: number;
  gamUser: GamificationUser;
}) {
  const setHideTabBar = useAppStore((s) => s.setHideTabBar);
  const [selected, setSelected] = useState<EvaluatedAchievement | null>(null);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const levelSummary = summarizeLevel(gamUser.huhaScore);

  useEffect(() => {
    setHideTabBar(open || showLevelModal);
    return () => setHideTabBar(false);
  }, [open, showLevelModal, setHideTabBar]);

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  return (
    <>
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl p-5 z-[90] shadow-2xl">
          {selected ? (
            <>
              <Dialog.Title className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <AchievementBadge item={selected} />
                <div>
                  <p>{selected.label}</p>
                  <p className="text-xs font-normal text-zinc-500 mt-0.5">
                    {selected.category === "task" ? "Thành tựu Task" : "Thành tựu Profile"}
                  </p>
                </div>
              </Dialog.Title>
              <p className="text-sm text-zinc-600 mb-4 leading-6">{selected.desc}</p>
              <div
                className={`p-4 rounded-2xl border ${
                  selected.unlocked ? "bg-emerald-50 border-emerald-200" : "bg-zinc-50 border-zinc-200"
                }`}
              >
                <p className="text-xs font-bold text-zinc-700 mb-2 uppercase tracking-wider">Điều kiện mở khóa</p>
                <p className="text-sm text-zinc-700 font-medium">{selected.condition}</p>
              </div>
              {selected.unlocked && (
                <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span className="text-sm font-bold">Đã mở khóa</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mt-4 w-full h-10 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-700"
              >
                Quay lại danh sách
              </button>
            </>
          ) : (
            <>
              <Dialog.Title className="text-xl font-bold text-zinc-900 mb-1">Tất cả thành tựu</Dialog.Title>
              <p className="text-xs text-zinc-500 mb-3">
                Đã mở khóa {unlockedCount}/{allAchievements.length} thành tựu
              </p>

              <button
                type="button"
                onClick={() => setShowLevelModal(true)}
                className="w-full mb-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 text-white text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs opacity-90">{levelSummary.tier.name}</p>
                      <p className="text-lg font-black">Lv.{levelSummary.level}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] opacity-80">Tổng XP</p>
                    <p className="text-sm font-bold">{levelSummary.huhaScore.toLocaleString("vi-VN")}</p>
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="flex justify-between text-[10px] mb-1 opacity-90">
                    <span>Tiến trình cấp</span>
                    <span>{levelSummary.currentExp}/{levelSummary.nextLevelExp} XP</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/30 overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${levelSummary.progress}%` }} />
                  </div>
                </div>
                <p className="text-[11px] mt-2 opacity-90">Bấm để xem hệ thống cấp HuHa</p>
              </button>

              <div className="grid grid-cols-3 gap-3">
                {allAchievements.map((item) => (
                  <AchievementBadge key={item.id} item={item} size="sm" onClick={() => setSelected(item)} />
                ))}
              </div>
            </>
          )}
          <Dialog.Close className="mt-5 w-full h-12 rounded-2xl bg-zinc-900 text-white font-semibold active:scale-[0.98] transition-all">
            Đóng
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <HuhaLevelModal
      open={showLevelModal}
      onOpenChange={setShowLevelModal}
      huhaScore={gamUser.huhaScore}
      isOwnProfile
    />
    </>
  );
}

export function AchievementGridPreview({
  gamUser,
  onViewAll,
  onSelect,
}: {
  gamUser: GamificationUser;
  onViewAll: () => void;
  onSelect: (item: EvaluatedAchievement) => void;
}) {
  const allAchievements = evaluateAchievements(gamUser);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {allAchievements.slice(0, 6).map((item) => (
          <AchievementBadge key={item.id} item={item} onClick={() => onSelect(item)} />
        ))}
      </div>
      {allAchievements.length > 6 && (
        <button
          type="button"
          onClick={onViewAll}
          className="w-full mt-3 py-2 rounded-xl bg-zinc-50 text-xs font-semibold text-zinc-600 active:bg-zinc-100"
        >
          Xem tất cả {allAchievements.length} thành tựu
        </button>
      )}
    </div>
  );
}
