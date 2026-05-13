"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { ShieldX, Clock3 } from "lucide-react";
import FCMProvider from "@/components/FCMProvider";
import BottomNav from "@/components/BottomNav";
import WarningModal from "@/components/WarningModal";

type Props = {
  children: React.ReactNode;
};

type WarningData = {
  reason: string;
  title: string;
  message: string;
  warningAt: Timestamp | undefined;
};

export default function ClientLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const { user, loading } = useAuth();

  const [warningOpen, setWarningOpen] = useState(false);
  const [banData, setBanData] = useState<{
    banned: boolean | null;
    bannedReason: string;
    bannedUntil: Timestamp | null;
  }>({
    banned: null,
    bannedReason: "",
    bannedUntil: null,
  });
  const [warningData, setWarningData] = useState<WarningData>({
    reason: "",
    title: "",
    message: "",
    warningAt: undefined,
  });

  /* ================= ROUTES ================= */
  const publicRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/verify-email",
    "/terms",
    "/privacy",
  ];

  const isPublic = useMemo(() => {
    return publicRoutes.some((r) => pathname.startsWith(r));
  }, [pathname]);

  const isChatDetail = /^\/chat\/[^/]+$/.test(pathname);
  const isCreate = pathname.startsWith("/create");

  /* ================= WARNING + BAN ================= */
  useEffect(() => {
    if (!user) {
      setBanData({ banned: null, bannedReason: "", bannedUntil: null }); // reset về null để chờ load lại
      return;
    }

    const db = getFirebaseDB();
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (!snap.exists()) {
          setBanData({ banned: false, bannedReason: "", bannedUntil: null });
          setWarningOpen(false);
          return;
        }

        const data = snap.data();
        setBanData({
          banned: data.banned || false,
          bannedReason: data.bannedReason || "",
          bannedUntil: data.bannedUntil || null,
        });

        const hasWarning = data.warning === true;
        const warningSeen = data.warningSeen === true;

        if (hasWarning &&!warningSeen) {
          setWarningData({
            reason: data.warningReason || data.bannedReason || "Vi phạm tiêu chuẩn cộng đồng",
            title: data.warningTitle || "Tài khoản bị cảnh cáo",
            message: data.warningMessage || "Bạn đã vi phạm Tiêu chuẩn cộng đồng của AIR",
            warningAt: data.warningAt,
          });
          setWarningOpen(true);
        } else {
          setWarningOpen(false);
        }
      },
      (error) => {
        console.error("Warning snapshot error:", error);
        setBanData({ banned: false, bannedReason: "", bannedUntil: null });
      }
    );

    return () => unsub();
  }, );

  /* ================= LOADING ================= */
  // 1. Đang check auth hoặc chưa load xong ban data
  if (loading || (user && banData.banned === null)) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0A84FF]/20 border-t-[#0A84FF] rounded-full animate-spin" />
      </div>
    );
  }

  // 2. Chưa login mà vào route private -> chặn render. Để page tự redirect
  if (!user &&!isPublic) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0A84FF]/20 border-t-[#0A84FF] rounded-full animate-spin" />
      </div>
    );
  }

  /* ================= BAN SCREEN ================= */
  if (user && banData.banned) {
    const bannedUntil =
      banData.bannedUntil &&
      typeof (banData.bannedUntil as any)?.toDate === "function"
      ? (banData.bannedUntil as any).toDate()
        : null;

    const isPermanent =!bannedUntil;
    const remainMs = bannedUntil? bannedUntil.getTime() - Date.now() : 0;
    const remainDays = Math.max(0, Math.floor(remainMs / 1000 / 60 / 60 / 24));

    return (
      <div className="fixed inset-0 z-[999999999] bg-[#F5F5F7] dark:bg-black flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-[6px]" />
        <div className="absolute top-[120px] w-[280px] h-[280px] bg-[#0A84FF]/10 blur-3xl rounded-full" />
        <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[36px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#E5E5EA] dark:border-zinc-800 overflow-hidden">
          <div className="p-7">
            <div className="w-28 h-28 rounded-[34px] bg-gradient-to-br from-[#0A84FF] to-[#5AC8FA] flex items-center justify-center mx-auto shadow-[0_10px_40px_rgba(10,132,255,0.35)] mb-7">
              <ShieldX className="text-white" size={52} strokeWidth={2.2} />
            </div>
            <h1 className="text-[24px] font-black text-[#1C1C1E] dark:text-white text-center tracking-tight mb-2">
              Tài khoản đã bị khóa
            </h1>
            <p className="text-center text-[15px] text-[#8E8E93] dark:text-zinc-400 leading-relaxed mb-7">
              Bạn đã vi phạm Tiêu chuẩn cộng đồng của AIR
            </p>
            <div className="bg-gradient-to-r from-[#F0F8FF] to-[#E6F4FF] dark:from-[#0A84FF]/10 dark:to-[#5AC8FA]/10 border border-[#BEE3FF] dark:border-[#0A84FF]/20 rounded-[28px] p-5 mb-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-[#0A84FF] flex items-center justify-center shrink-0 shadow-lg">
                  <ShieldX className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[#0A84FF] font-bold text-[15px] mb-1">Lý do vi phạm</p>
                  <p className="text-[#1C1C1E] dark:text-white text-[24px] font-black leading-tight">
                    {banData.bannedReason || "Vi phạm cộng đồng"}
                  </p>
                  <p className="text-[#8E8E93] dark:text-zinc-500 text-[13px] mt-2">
                    {isPermanent? "Khóa vĩnh viễn" : `Còn ${remainDays} ngày`}
                  </p>
                </div>
              </div>
            </div>
            {!isPermanent && (
              <div className="bg-[#F2F2F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 rounded-[24px] p-5 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#8E8E93] text-[13px] font-semibold mb-1">THỜI GIAN CÒN LẠI</p>
                    <p className="text-[34px] font-black text-[#1C1C1E] dark:text-white tracking-tight">
                      {remainDays}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-[#0A84FF] flex items-center justify-center shadow-lg shadow-[#0A84FF]/20">
                    <Clock3 className="text-white" size={26} />
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                window.location.href = "/login";
              }}
              className="w-full h-16 rounded-[24px] bg-gradient-to-r from-[#0A84FF] to-[#7DD3FC] text-white font-black text-[18px] shadow-[0_10px_30px_rgba(10,132,255,0.35)] active:scale-[0.98] transition-all"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-colors font-sans">
      {user && <FCMProvider userId={user.uid} />}
      <div className={!isChatDetail &&!isCreate? "pb-24" : ""}>{children}</div>
      {!isPublic && user &&!isChatDetail &&!isCreate && <BottomNav />}
      {user && (
        <WarningModal
          open={warningOpen}
          uid={user.uid}
          reason={warningData.reason}
          title={warningData.title}
          message={warningData.message}
          warningAt={warningData.warningAt}
        />
      )}
    </div>
  );
}