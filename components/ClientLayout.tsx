"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  doc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

import {
  ShieldX,
  Clock3,
} from "lucide-react";

import FCMProvider from "@/components/FCMProvider";
import BottomNav from "@/components/BottomNav";
import WarningModal from "@/components/WarningModal";
import LottiePlayer from "@/components/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";
import errorShake from "@/public/lotties/huha-error-shake.json";

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
  const router = useRouter();

  const { user, loading } = useAuth();

  const [warningOpen, setWarningOpen] = useState(false);

  const [banData, setBanData] = useState({
    banned: false,
    bannedReason: "",
    bannedUntil: null as Timestamp | null,
  });

  const [warningData, setWarningData] =
    useState<WarningData>({
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
    return publicRoutes.some((r) =>
      pathname.startsWith(r)
    );
  }, [pathname]);

  const isChatDetail =
    /^\/chat\/[^/]+$/.test(pathname);

  const isCreate =
    pathname.startsWith("/create");

  /* ================= HUHA LOTTIE PREFETCH - Zomato style ================= */

  useEffect(() => {
    if (typeof window!== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("huha-reduce");
    }
    const idle = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 800));
    idle(() => {
      [
        "/lotties/huha-loading-pull.json",
        "/lotties/huha-error-shake.json",
        "/lotties/huha-empty.json",
        "/lotties/huha-success-check.json",
        "/lotties/huha-celebrate.json",
        "/lotties/huha-wallet-open.json",
      ].forEach(s => fetch(s, {priority:"low"} as any).catch(()=>{}));
    });
  }, []);

  /* ================= REDIRECT ================= */

  useEffect(() => {
    if (loading) return;

    if (!user &&!isPublic) {
      router.replace("/login");
    }
  }, [user, loading, isPublic, router]);

  /* ================= USER SNAPSHOT ================= */

  useEffect(() => {

    if (!user) return;

    const db = getFirebaseDB();

    const unsub = onSnapshot(
      doc(db, "users", user.uid),

      (snap) => {

        if (!snap.exists()) {
          setWarningOpen(false);
          return;
        }

        const data = snap.data();

        /* ===== BAN ===== */

        setBanData({
          banned: data.banned || false,
          bannedReason:
            data.bannedReason || "",
          bannedUntil:
            data.bannedUntil || null,
        });

        /* ===== WARNING ===== */

        const hasWarning =
          data.warning === true;

        const warningSeen =
          data.warningSeen === true;

        if (hasWarning &&!warningSeen) {

          setWarningData({
            reason:
              data.warningReason ||
              data.bannedReason ||
              "Vi phạm tiêu chuẩn cộng đồng",

            title:
              data.warningTitle ||
              "Tài khoản bị cảnh cáo",

            message:
              data.warningMessage ||
              "Bạn đã vi phạm Tiêu chuẩn cộng đồng của HUHA",

            warningAt:
              data.warningAt,
          });

          setWarningOpen(true);

        } else {
          setWarningOpen(false);
        }
      },

      (error) => {
        console.error(
          "Warning snapshot error:",
          error
        );
      }
    );

    return () => unsub();

  }, [user]);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#FAFAFB] dark:bg-zinc-950 flex items-center justify-center">

        <div className="w-36 h-36">
          <LottiePlayer animationData={loadingPull} loop autoplay className="w-36 h-36" />
        </div>

      </div>
    );
  }

  /* ================= BAN SCREEN ================= */

  if (user && banData.banned) {

    const bannedUntil =
      banData.bannedUntil &&
      typeof (banData.bannedUntil as any)
      ?.toDate === "function"
      ? (banData.bannedUntil as any)
          .toDate()
        : null;

    const isPermanent =
    !bannedUntil;

    const remainMs =
      bannedUntil
      ? bannedUntil.getTime() -
          Date.now()
        : 0;

    const remainDays = Math.max(
      0,
      Math.floor(
        remainMs /
          1000 / 60 / 60 / 24
      )
    );

    return (

      <div className="fixed inset-0 z-[999999999] bg-[#F5F7FA] dark:bg-black flex items-center justify-center p-4 overflow-hidden">

        {/* BACKGROUND */}
        <div className="absolute inset-0 backdrop-blur-[6px]" />

        <div className="absolute top-[120px] w-[280px] h-[280px] bg-[#0042B2]/10 blur-3xl rounded-full" />

        {/* CARD */}
        <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[36px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#E5E5EA] dark:border-zinc-800 overflow-hidden">

          <div className="p-7">

            {/* ICON - HUHA LOTTIE */}
            <div className="w-28 h-28 mx-auto mb-7">
              <LottiePlayer animationData={errorShake} loop autoplay className="w-28 h-28" />
            </div>

            {/* TITLE */}
            <h1 className="text-[24px] font-black text-[#1C1C1E] dark:text-white text-center tracking-tight mb-2">

              Tài khoản đã bị khóa

            </h1>

            <p className="text-center text-[15px] text-[#8E8E93] dark:text-zinc-400 leading-relaxed mb-7">

              Bạn đã vi phạm Tiêu chuẩn cộng đồng của HUHA

            </p>

            {/* REASON */}
            <div className="bg-gradient-to-r from-[#0042B2]/5 to-[#00C853]/5 dark:from-[#0042B2]/10 dark:to-[#00C853]/10 border border-[#0042B2]/20 dark:border-[#0042B2]/20 rounded-[28px] p-5 mb-5">

              <div className="flex items-start gap-4">

                <div className="w-11 h-11 rounded-full bg-[#0042B2] flex items-center justify-center shrink-0 shadow-lg">

                  <ShieldX
                    className="text-white"
                    size={20}
                  />

                </div>

                <div className="flex-1">

                  <p className="text-[#0042B2] font-bold text-[15px] mb-1">

                    Lý do vi phạm

                  </p>

                  <p className="text-[#1C1C1E] dark:text-white text-[24px] font-black leading-tight">

                    {banData.bannedReason ||
                      "Vi phạm cộng đồng"}

                  </p>

                  <p className="text-[#8E8E93] dark:text-zinc-500 text-[13px] mt-2">

                    {isPermanent
                    ? "Khóa vĩnh viễn"
                      : `Còn ${remainDays} ngày`}

                  </p>

                </div>
              </div>
            </div>

            {/* NOTE */}
            <div className="bg-[#F8F8F8] dark:bg-zinc-800/60 border border-[#E5E5EA] dark:border-zinc-700 rounded-[24px] p-5 mb-6">

              <p className="text-center text-[15px] leading-relaxed text-[#636366] dark:text-zinc-300">

                <span className="font-bold text-[#1C1C1E] dark:text-white">

                  Lưu ý:

                </span>{" "}

                Nếu tiếp tục vi phạm,
                tài khoản của bạn có thể
                bị khóa vĩnh viễn và
                không thể khôi phục.

              </p>

            </div>

            {/* COUNTDOWN */}
            {!isPermanent && (

              <div className="bg-[#F2F2F7] dark:bg-zinc-800 border border-[#E5E5EA] dark:border-zinc-700 rounded-[24px] p-5 mb-6">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-[#8E8E93] text-[13px] font-semibold mb-1">

                      THỜI GIAN CÒN LẠI

                    </p>

                    <p className="text-[34px] font-black text-[#1C1C1E] dark:text-white tracking-tight">

                      {remainDays}

                    </p>

                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-[#0042B2] flex items-center justify-center shadow-lg shadow-[#0042B2]/20">

                    <Clock3
                      className="text-white"
                      size={26}
                    />

                  </div>

                </div>

              </div>
            )}

            {/* BUTTON */}
            <button
              onClick={() => {
                router.replace("/login");
              }}
              className="w-full h-16 rounded-[24px] bg-gradient-to-r from-[#0042B2] to-[#00C853] text-white font-black text-[18px] shadow-[0_10px_30px_rgba(0,66,178,0.35)] active:scale-[0.98] transition-all"
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

    <div className="min-h-screen bg-gradient-to-b from-[#FAFAFB] to-white dark:from-zinc-950 dark:to-zinc-900 transition-colors font-sans">

      {/* FCM */}
      {user && (
        <FCMProvider userId={user.uid} />
      )}

      {/* PAGE */}
      <div
        className={
        !isChatDetail &&!isCreate
          ? "pb-24"
            : ""
        }
      >
        {children}
      </div>

      {/* BOTTOM NAV */}
      {!isPublic &&
        user &&
      !isChatDetail &&
      !isCreate && (
          <BottomNav />
        )}

      {/* WARNING MODAL */}
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