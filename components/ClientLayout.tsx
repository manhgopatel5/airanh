"use client";

import { initFCM } from "@/lib/fcm";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react"; // 🔥 thêm useRef
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

  const [loading, setLoading] = useState(true);

  // 🔥 FIX: chặn initFCM gọi nhiều lần
  const fcmCalledRef = useRef(false);

  /* ================= PUBLIC ROUTES ================= */
  const publicRoutes = ["/login", "/register"];

  const isPublic = useMemo(() => {
    return publicRoutes.some((route) =>
      pathname.startsWith(route)
    );
  }, [pathname]);

  /* ================= HIDE NAV ================= */
  const isChatDetail = pathname.startsWith("/chat/");

  /* ================= REDIRECT ================= */
  useEffect(() => {
    if (user === undefined) return;

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

  /* ================= FCM INIT (FIX X2) ================= */
  useEffect(() => {
    if (!user?.uid || fcmCalledRef.current) return;

    fcmCalledRef.current = true;

    initFCM(user.uid);
  }, [user]);

  /* ================= BLOCK RENDER ================= */
  if (loading) return null;

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
