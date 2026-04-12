"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/AuthContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [mounted, setMounted] = useState(false);

  const publicRoutes = ["/login", "/register"];
  const isPublic = publicRoutes.includes(pathname);

  /* ================= MOUNT ================= */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* ================= REDIRECT ================= */
  useEffect(() => {
    if (!mounted) return;

    // 🔥 CHỐNG TREO: nếu loading quá lâu vẫn cho chạy
    if (loading) return;

    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }

    if (user && isPublic) {
      router.replace("/");
      return;
    }
  }, [user, loading, isPublic, pathname, router, mounted]);

  /* ================= RENDER ================= */

  // ❗ KHÔNG return null (tránh trắng màn hình)
  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // 🔥 loading chỉ hiển thị UI, không block logic
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* CONTENT */}
      <div className="pb-20">{children}</div>

      {/* NAV */}
      {!isPublic && user && <BottomNav />}
    </div>
  );
}