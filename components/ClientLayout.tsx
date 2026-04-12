"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/AuthContext";

export default function ClientLayout({ children }: any) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const publicRoutes = ["/login", "/register"];
  const isPublic = publicRoutes.includes(pathname);

  // ⏳ loading
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // ❌ chưa login → show login luôn
  if (!user && !isPublic) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Vui lòng đăng nhập</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {children}
      {!isPublic && <BottomNav />}
    </div>
  );
}
