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
  const isPublic = publicRoutes.includes(pathname);

  // ⏳ chờ Firebase load xong
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // 🔥 redirect chuẩn (KHÔNG loop)
  useEffect(() => {
    if (!user && !isPublic) {
      router.replace("/login");
    }

    if (user && isPublic) {
      router.replace("/");
    }
  }, [user, pathname]);

  return (
    <div className="pb-20">
      {children}
      {!isPublic && user && <BottomNav />}
    </div>
  );
}
