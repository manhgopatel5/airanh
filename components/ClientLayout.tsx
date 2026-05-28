"use client";

import { usePathname, useRouter } from "next/navigation";
import FCMProvider from "@/components/FCMProvider";
import { useEffect, useMemo } from "react";
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

  return (
    <div className="h-dvh flex flex-col bg-gray-50 dark:bg-zinc-950 font-sans">
      {user && <FCMProvider userId={user.uid} />}

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* BỎ HẾT BOTTOMNAV Ở ĐÂY. Để page tự import */}

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