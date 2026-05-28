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
    if (loading) return;
    
    if (!user &&!isPublic) {
      router.replace("/login");
      return;
    }

    if (user && isPublic &&!pathname.startsWith("/verify-email") && pathname!== "/onboarding") {
      router.replace("/");
      return;
    }

    if (user && userData && userData.onboardingCompleted === false && pathname!== "/onboarding") {
      router.replace("/onboarding");
      return;
    }

    if (user && userData && userData.onboardingCompleted === true && pathname === "/onboarding") {
      router.replace("/");
      return;
    }
  }, [user, userData, loading, isPublic, pathname, router]);

  // Trang nào có BottomNav
  const exactBottomNavRoutes = ["/", "/orders", "/notifications", "/profile"];
  const shouldShowBottomNav = exactBottomNavRoutes.includes(pathname) &&!isChatDetail &&!isCreate;

  return (
    // 1. Bỏ overflow-hidden ở đây. Để main tự scroll
    <div className="h-dvh flex flex-col bg-gray-50 dark:bg-zinc-950 font-sans">
      {user && <FCMProvider userId={user.uid} />}

      {/* 2. Main không cần pb-20 nữa vì BottomNav của bạn đã là floating */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* 3. QUAN TRỌNG: KHÔNG BỌC BottomNav. Để nó tự lo fixed + z-index */}
      {shouldShowBottomNav &&!isPublic && user && <BottomNav />}

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