"use client";

import { initFCM } from "@/lib/fcm";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react"; // ✅ thêm useState
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/AuthContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true); // ✅ FIX AUTH DELAY

  /* ================= PUBLIC ROUTES ================= */
  const publicRoutes = ["/login", "/register"];

  const isPublic = useMemo(() => {
    return publicRoutes.some((route) =>
      pathname.startsWith(route)
    );
  }, [pathname]);

  /* ================= HIDE NAV ================= */
  const isChatDetail = pathname.startsWith("/chat/");

  /* ================= REDIRECT (FIX NOTIFICATION BUG) ================= */
  useEffect(() => {
    // 🔥 nếu auth chưa load xong → không làm gì
    if (user === undefined) return;

    // ✅ auth đã xong
    setLoading(false);

    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }

    if (user && isPublic) {
      router.replace("/");
      return;
    }
  }, [user, isPublic, router]);

  /* ================= FCM INIT ================= */
  useEffect(() => {
    if (user?.uid) {
      initFCM(user.uid);
    }
  }, [user]);

  /* ================= BLOCK RENDER KHI CHƯA LOAD ================= */
  if (loading) return null; // 🔥 QUAN TRỌNG

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen bg-gray-50">

      {/* CONTENT */}
      <div className={!isChatDetail ? "pb-20" : ""}>
        {children}
      </div>

      {/* NAV */}
      {!isPublic && user && !isChatDetail && <BottomNav />}

    </div>
  );
}
