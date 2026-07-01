"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Shield, ChevronRight } from "lucide-react";
import { calcTrustBreakdown, type GamificationStats } from "@/lib/gamification";

type TrustScoreModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: GamificationStats;
  emailVerified?: boolean;
  isVerifiedId?: boolean;
  joinedDays?: number;
  isOwnProfile?: boolean;
  onNavigate?: (href: string) => void;
};

export default function TrustScoreModal({
  open,
  onOpenChange,
  stats,
  emailVerified,
  isVerifiedId,
  joinedDays = 0,
  isOwnProfile = false,
  onNavigate,
}: TrustScoreModalProps) {
  const breakdown = calcTrustBreakdown({
    stats,
    emailVerified: !!emailVerified,
    isVerifiedId: !!isVerifiedId,
    joinedDays,
  });
  const rating = stats.rating || 0;
  const completed = stats.completed || 0;
  const totalReviews = stats.totalReviews || 0;

  const rows = [
    {
      key: "rating",
      label: "Đánh giá trung bình",
      earned: breakdown.rating,
      max: 75,
      detail: `${rating.toFixed(1)} sao × 15 điểm (tối đa 75)`,
      tip: rating < 4.5 ? "Hoàn thành task tốt và nhận đánh giá cao từ đối tác" : "Duy trì chất lượng công việc để giữ điểm cao",
      href: isOwnProfile ? "/?tab=tasks" : undefined,
    },
    {
      key: "completed",
      label: "Công việc hoàn thành",
      earned: breakdown.completed,
      max: 30,
      detail: `${completed} job × 1.2 điểm (tối đa 30)`,
      tip: completed < 25 ? "Tham gia và hoàn thành thêm task/plan" : "Tiếp tục hoàn thành để duy trì uy tín",
      href: isOwnProfile ? "/?tab=home" : undefined,
    },
    {
      key: "reviews",
      label: "Số lượng đánh giá",
      earned: breakdown.reviews,
      max: 20,
      detail: `${totalReviews} đánh giá × 1 điểm (tối đa 20)`,
      tip: totalReviews < 10 ? "Làm việc với nhiều đối tác để nhận thêm feedback" : "Càng nhiều đánh giá, uy tín càng vững",
      href: isOwnProfile ? undefined : undefined,
    },
    {
      key: "verification",
      label: "Xác minh tài khoản",
      earned: breakdown.verification,
      max: 10,
      detail: `Email ${emailVerified ? "✓ +5" : "✗ 0"}, CCCD ${isVerifiedId ? "✓ +5" : "✗ 0"}`,
      tip: !emailVerified || !isVerifiedId ? "Xác minh email và CCCD để cộng thêm điểm" : "Đã xác minh đầy đủ",
      href: isOwnProfile ? (!emailVerified ? "/verify-email" : !isVerifiedId ? "/settings/profile-edit" : undefined) : undefined,
    },
    {
      key: "tenure",
      label: "Thời gian tham gia",
      earned: breakdown.tenure,
      max: 5,
      detail:
        joinedDays > 0
          ? `${joinedDays} ngày ≈ ${Math.floor(joinedDays / 30)} tháng (tối đa 5)`
          : "Chưa có dữ liệu (tối đa 5)",
      tip: joinedDays < 90 ? "Hoạt động đều đặn — thời gian càng lâu điểm càng cao" : "Bạn đã là thành viên lâu năm",
      href: undefined,
    },
  ];

  const handleRowClick = (href?: string) => {
    if (!href || !onNavigate) return;
    onOpenChange(false);
    onNavigate(href);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl p-5 z-[90] shadow-2xl">
          <Dialog.Title className="text-xl font-bold text-zinc-900 mb-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Độ uy tín
          </Dialog.Title>
          <p className="text-sm text-zinc-600 mb-4">
            Điểm uy tín phản ánh mức tin cậy dựa trên đánh giá, hoạt động và xác minh tài khoản.
          </p>

          <div className="space-y-2 mb-5">
            {rows.map((row) => (
              <button
                key={row.key}
                type="button"
                disabled={!row.href}
                onClick={() => handleRowClick(row.href)}
                className={`w-full p-3 rounded-2xl border text-left transition-all ${
                  row.href
                    ? "bg-zinc-50 border-zinc-200 active:scale-[0.98] hover:bg-blue-50 hover:border-blue-200"
                    : "bg-zinc-50 border-zinc-200"
                }`}
              >
                <div className="flex justify-between items-center mb-1 gap-2">
                  <span className="text-sm font-semibold text-zinc-700">{row.label}</span>
                  <span className="text-sm font-bold text-blue-600 shrink-0">
                    +{row.earned}/{row.max}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{row.detail}</p>
                {isOwnProfile && row.tip && (
                  <p className="text-xs text-blue-600 mt-1.5 font-medium">{row.tip}</p>
                )}
                {row.href && (
                  <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-blue-500">
                    Cải thiện ngay
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 text-white">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Tổng điểm uy tín</span>
              <span className="text-2xl font-bold">{breakdown.total}/100</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/30 overflow-hidden">
              <div className="h-full rounded-full bg-white" style={{ width: `${breakdown.total}%` }} />
            </div>
          </div>

          <Dialog.Close className="mt-5 w-full h-12 rounded-2xl bg-zinc-900 text-white font-semibold active:scale-[0.98] transition-all">
            Đã hiểu
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
