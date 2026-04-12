"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/AuthContext";

export default function ClientLayout({ children }: any) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const didRedirect = useRef(false); // 🔥 chống redirect nhiều lần

  const publicRoutes = ["/login", "/register"];

  useEffect(() => {
    if (loading) return;
    if (didRedirect.current) return;

    // ❌ chưa login
    if (!user && !publicRoutes.includes(pathname)) {
      didRedirect.current = true;
      router.replace("/login");
      return;
    }

    // ✅ đã login
    if (user && publicRoutes.includes(pathname)) {
      didRedirect.current = true;
      router.replace("/");
      return;
    }
  }, [user, loading]);

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