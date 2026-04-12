"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/AuthContext";

export default function ClientLayout({ children }: any) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const publicRoutes = ["/login", "/register"];

  useEffect(() => {
    if (loading) return;

    // ❌ Chưa login → về login
    if (!user && !publicRoutes.includes(pathname)) {
      router.replace("/login");
      return;
    }

    // ✅ Đã login → không cho quay lại login/register
    if (user && publicRoutes.includes(pathname)) {
      router.replace("/");
      return;
    }
  }, [user, loading]); // ❗ bỏ pathname để tránh loop

  const hideNav = publicRoutes.includes(pathname);

  // 🔥 loading tránh flicker + tránh bug redirect
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* CONTENT */}
      {children}

      {/* NAVBAR */}
      {!hideNav && <BottomNav />}
    </div>
  );
}