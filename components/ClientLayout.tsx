"use client";

import { Suspense, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import FCMProvider from "@/components/FCMProvider";
import ChatPushPermissionGate from "@/components/ChatPushPermissionGate";
import StrangerStatusBanners from "@/components/stranger/StrangerStatusBanners";
import { Toaster } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { isGuestBrowsableRoute } from "@/components/auth/authRoutes";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
};

export default function ClientLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  const isPublic = useMemo(
    () => isGuestBrowsableRoute(pathname),
    [pathname]
  );
  const isHomeShell = pathname === "/";

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }

    if (
      user &&
      (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")
    ) {
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
    <div className="h-dvh flex flex-col bg-white dark:bg-zinc-950 font-sans">
      {user && <FCMProvider userId={user.uid} />}
      {user && <StrangerStatusBanners />}
      {user && (
        <Suspense fallback={null}>
          <ChatPushPermissionGate />
        </Suspense>
      )}

  <main
    className={cn(
      "flex-1 pt-[env(safe-area-inset-top)]",
      isHomeShell
        ? "overflow-hidden flex flex-col min-h-0"
        : "overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom)+16px)] [-webkit-overflow-scrolling:touch] overscroll-y-contain"
    )}
  >
    {children}
  </main>

      <Toaster
        richColors
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { fontSize: "14px" },
        }}
      />
    </div>
  );
}