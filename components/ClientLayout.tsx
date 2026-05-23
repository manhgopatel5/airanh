"use client";

import { usePathname, useRouter } from "next/navigation";
import FCMProvider from "@/components/FCMProvider";
import { useEffect, useMemo, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/lib/AuthContext";

type Props = {
  children: React.ReactNode;
};

export default function ClientLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, loading } = useAuth();

  const hasInitiallyLoaded = useRef(false);

  const publicRoutes = ["/login", "/register", "/forgot-password", "/verify-email", "/terms", "/privacy"];

  const isPublic = useMemo(
    () => publicRoutes.some((r) => pathname.startsWith(r)),
    [pathname]
  );

  const isChatDetail = /^\/chat\/[^/]+$/.test(pathname);
  const isCreate = pathname.startsWith("/create");

  /* ================= REDIRECT ================= */
  useEffect(() => {
    if (loading) return;
    if (!user &&!isPublic) {
      router.replace("/login");
    }
  }, [user, loading, isPublic, router]);

  if (!loading &&!hasInitiallyLoaded.current) {
    hasInitiallyLoaded.current = true;
  }

  /* ================= LOADING THÔNG MINH ================= */
  if (loading &&!hasInitiallyLoaded.current) {
    return null;
  }

  const exactBottomNavRoutes = ["/orders", "/notifications"];
  const shouldShowOldBottomNav = exactBottomNavRoutes.includes(pathname);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-colors font-sans overflow-hidden">
      {user && <FCMProvider userId={user.uid} />}

      {/* Main scroll container - mỗi page scroll riêng */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* BottomNav cố định, không scroll */}
      {shouldShowOldBottomNav &&!isPublic && user &&!isChatDetail &&!isCreate && (
        <BottomNav />
      )}

      <Toaster
        position="top-center"
        toastOptions={{
          className: "text-sm font-sans",
          duration: 3000,
        }}
      />
    </div>
  );
}