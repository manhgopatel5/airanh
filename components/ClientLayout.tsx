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

    // ❌ chưa login
    if (!user && !publicRoutes.includes(pathname)) {
      router.replace("/login");
      return;
    }

    // ✅ đã login
    if (user && publicRoutes.includes(pathname)) {
      router.replace("/");
      return;
    }
  }, [user, loading, pathname]); // ✅ PHẢI có pathname

  const hideNav = publicRoutes.includes(pathname);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="pb-20">
      {children}
      {!hideNav && <BottomNav />}
    </div>
  );
}