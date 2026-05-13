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
  const router = useRouter();

  const { user, loading } = useAuth();

  const [warningOpen, setWarningOpen] = useState(false);

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

  /* ================= REDIRECT ================= */

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublic) {
      router.replace("/login");
    }
  }, [user, loading, isPublic, router]);

  /* ================= WARNING ================= */

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

        const hasWarning = data.warning === true;

        const warningSeen = data.warningSeen === true;

        // HIỆN MODAL
        if (hasWarning && !warningSeen) {
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
              "Bạn đã vi phạm Tiêu chuẩn cộng đồng của AIR",

            warningAt: data.warningAt,
          });

          setWarningOpen(true);
        } else {
          setWarningOpen(false);
        }
      },
      (error) => {
        console.error("Warning snapshot error:", error);
      }
    );

    return () => unsub();
  }, [user]);

  /* ================= LOADING ================= */

  if (loading) return null;

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-colors font-sans">
      
      {/* FCM */}
      {user && <FCMProvider userId={user.uid} />}

      {/* PAGE */}
      <div className={!isChatDetail && !isCreate ? "pb-24" : ""}>
        {children}
      </div>

      {/* BOTTOM NAV */}
      {!isPublic &&
        user &&
        !isChatDetail &&
        !isCreate && <BottomNav />}

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