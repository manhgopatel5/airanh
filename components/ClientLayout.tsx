"use client";

import { usePathname, useRouter } from "next/navigation";
import FCMProvider from "@/components/FCMProvider";
import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";

import { useAuth } from "@/lib/AuthContext";

import {
  doc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

import { getFirebaseDB } from "@/lib/firebase";

import WarningModal from "@/components/WarningModal";

type Props = {
  children: React.ReactNode;
};

export default function ClientLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, loading } = useAuth();

  const [warningOpen, setWarningOpen] = useState(false);

  const [warningData, setWarningData] = useState({
    reason: "",
    title: "",
    message: "",
    warningAt: undefined as Timestamp | undefined,
  });

  const publicRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/verify-email",
    "/terms",
    "/privacy",
  ];

  const isPublic = useMemo(
    () => publicRoutes.some((r) => pathname.startsWith(r)),
    [pathname]
  );

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

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();

      // CHỈ hiện khi có cảnh báo và chưa xác nhận
      if (data.warningReason && !data.warningSeen) {
        setWarningData({
          reason: data.warningReason || "",
          title: data.warningTitle || "",
          message: data.warningMessage || "",
          warningAt: data.warningAt,
        });

        setWarningOpen(true);
      } else {
        setWarningOpen(false);
      }
    });

    return () => unsub();
  }, [user]);

  /* ================= LOADING ================= */
  if (loading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-colors font-sans">
      {user && <FCMProvider userId={user.uid} />}

      <div className={!isChatDetail && !isCreate ? "pb-24" : ""}>
        {children}
      </div>

      {!isPublic && user && !isChatDetail && !isCreate && (
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