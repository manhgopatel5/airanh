"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/AuthContext";

export default function ClientLayout({ children }: any) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const publicRoutes = ["/login", "/register"];

  useEffect(() => {
    // ❌ chưa login → đá về login
    if (!user && !publicRoutes.includes(pathname)) {
      router.replace("/login");
    }

    // ✅ đã login → không cho vào login/register
    if (user && publicRoutes.includes(pathname)) {
      router.replace("/tasks");
    }
  }, [user, pathname]);

  const hideNav = publicRoutes.includes(pathname);

  return (
    <>
      {children}
      {!hideNav && <BottomNav />}
    </>
  );
}
