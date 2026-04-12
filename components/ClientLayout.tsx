"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
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

  const publicRoutes = ["/login", "/register"];
  const isPublic = publicRoutes.includes(pathname);

  /* ================= REDIRECT ================= */
  useEffect(() => {
    if (loading) return; // 🔥 chỉ chặn redirect, không chặn render

    if (!user && !isPublic) {
      router.replace("/login");
    }

    if (user && isPublic) {
      router.replace("/");
    }
  }, [user, loading, isPublic, router]);

  /* ================= LOADING UI ================= */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-gray-400">Đang tải...</div>
      </div>
    );
  }

  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div className="pb-20">{children}</div>

      {!isPublic && user && <BottomNav />}
    </div>
  );
}
