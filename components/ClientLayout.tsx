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

  const publicRoutes = [
    "/login", 
    "/register", 
    "/forgot-password", 
    "/verify-email", 
    "/terms", 
    "/privacy", 
    "/onboarding"
  ];

  const isPublic = useMemo(
    () => publicRoutes.some((r) => pathname.startsWith(r)),
    [pathname]
  );

  const isChatDetail = /^\/chat\/[^/]+$/.test(pathname);
  const isCreate = pathname.startsWith("/create");

  /* ================= REDIRECT ================= */
  useEffect(() => {
    // 1. Đợi AuthContext load xong. Vì có cache nên loading=false ngay
    if (loading) return;
    
    // 2. Chưa login + vào trang private -> về /login
    if (!user &&!isPublic) {
      router.replace("/login");
      return;
    }

    // 3. Đã login + vào /login, /register... -> về home
    // Loại trừ /verify-email và /onboarding
    if (user && isPublic &&!pathname.startsWith("/verify-email") && pathname!== "/onboarding") {
      router.replace("/");
      return;
    }

    // 4. Check onboarding: userData có sẵn từ cache nên check được ngay 0ms
    if (user && userData && userData.onboardingCompleted === false && pathname!== "/onboarding") {
      router.replace("/onboarding");
      return;
    }

    // 5. Đã onboard + ở /onboarding -> về home
    if (user && userData && userData.onboardingCompleted === true && pathname === "/onboarding") {
      router.replace("/");
      return;
    }
  }, [user, userData, loading, isPublic, pathname, router]);

  // 6. KHÔNG RETURN NULL, KHÔNG SPINNER Ở ĐÂY
  // Để AuthContext + Suspense lo. Layout phải render ngay.
  
  const exactBottomNavRoutes = ["/", "/orders", "/notifications"];
  const shouldShowBottomNav = exactBottomNavRoutes.includes(pathname);

  return (
    // 7. FIX LAYOUT: Dùng h-dvh thay h-screen cho mobile. Bỏ overflow-hidden
    <div className="h-dvh flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-colors font-sans">
      {/* 8. FCM chỉ mount khi có user. Không chặn render */}
      {user && <FCMProvider userId={user.uid} />}

      {/* Main scroll container. Thêm pb-20 để không bị BottomNav che */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* 9. FIX BOTTOMNAV: Thêm fixed + z-50 để nó luôn nằm trên cùng, không bị đè */}
      {shouldShowBottomNav &&!isPublic && user &&!isChatDetail &&!isCreate && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomNav />
        </div>
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