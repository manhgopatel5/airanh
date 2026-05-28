"use client";

import { usePathname, useRouter } from "next/navigation";
import FCMProvider from "@/components/FCMProvider";
import { useEffect, useMemo } from "react";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/lib/AuthContext";

type Props = {
  children: React.ReactNode;
};

export default function ClientLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  const publicRoutes = ["/login", "/register", "/forgot-password", "/verify-email", "/terms", "/privacy"];

  const isPublic = useMemo(
    () => publicRoutes.some((r) => pathname.startsWith(r)),
    [pathname]
  );

  const isChatDetail = /^\/chat\/[^/]+$/.test(pathname);
  const isCreate = pathname.startsWith("/create");

  /* ================= REDIRECT ================= */
  useEffect(() => {
    // 1. Không redirect nếu đang loading lần đầu có cache
    // AuthContext đã lo loading rồi, ở đây chỉ redirect khi chắc chắn không có user
    if (loading) return;
    
    // Chưa login + vào trang private -> về /login
    if (!user &&!isPublic) {
      router.replace("/login");
      return;
    }

    // Đã login + vào /login -> về home
    if (user && isPublic &&!pathname.startsWith("/verify-email")) {
      router.replace("/");
      return;
    }

    // 2. Check onboarding: userData có sẵn từ cache nên check được ngay
    if (user && userData && userData.onboardingCompleted === false && pathname!== "/onboarding") {
      router.replace("/onboarding");
      return;
    }

    // Đã onboard + ở /onboarding -> về home
    if (user && userData && userData.onboardingCompleted === true && pathname === "/onboarding") {
      router.replace("/");
      return;
    }
  }, [user, userData, loading, isPublic, pathname, router]);

  // 3. BỎ HẾT LOADING Ở ĐÂY. Để AuthContext + Suspense lo.
  // Layout phải render ngay để không trắng màn hình
  
  const exactBottomNavRoutes = ["/orders", "/notifications", "/"];
  const shouldShowOldBottomNav = exactBottomNavRoutes.includes(pathname);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-colors font-sans overflow-hidden">
      {/* 4. Chỉ mount FCM khi có user. Không chờ loading */}
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