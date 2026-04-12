"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/AuthContext";

export default function ClientLayout({ children }: any) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const publicRoutes = ["/login", "/register"];
  const isPublic = publicRoutes.includes(pathname);

  // ⏳ loading thật sự
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* ❌ chưa login */}
      {!user && !isPublic ? (
        <div className="h-screen flex items-center justify-center">
          <p>Vui lòng đăng nhập</p>
        </div>
      ) : (
        children
      )}

      {/* navbar */}
      {!isPublic && user && <BottomNav />}
    </div>
  );
}
