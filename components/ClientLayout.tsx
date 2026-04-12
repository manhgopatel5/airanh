"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/AuthContext";

export default function ClientLayout({ children }: any) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth(); // 🔥 cần loading

  const publicRoutes = ["/login", "/register"];

  useEffect(() => {
    if (loading) return; // 🔥 CHẶN redirect khi chưa load xong

    // ❌ chưa login → về login
    if (!user && !publicRoutes.includes(pathname)) {
      router.replace("/login");
      return;
    }

    // ✅ đã login → nếu đang ở login/register → về HOME
    if (user && publicRoutes.includes(pathname)) {
      router.replace("/");
      return;
    }
  }, [user, loading, pathname]);

  const hideNav = publicRoutes.includes(pathname);

  // 🔥 tránh render khi chưa biết trạng thái auth
  if (loading) return null;

  return (
    <>
      {children}
      {!hideNav && <BottomNav />}
    </>
  );
}
