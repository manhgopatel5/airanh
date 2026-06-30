"use client";

import { usePathname, useRouter } from "next/navigation";
import FCMProvider from "@/components/FCMProvider";
import { useEffect, useMemo } from "react";
import { Toaster } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { isAuthPublicRoute } from "@/components/auth/authRoutes";

type Props = {
  children: React.ReactNode;
};

export default function ClientLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  const isPublic = useMemo(
    () => isAuthPublicRoute(pathname),
    [pathname]
  );

  useEffect(() => {
    if (loading) return;

    if (!user &&!isPublic) {
      router.replace("/login");
      return;
    }

    if (user && isPublic && !pathname.startsWith("/verify-email") && pathname !== "/onboarding" && pathname !== "/login" && pathname !== "/register") {
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

  <main className="flex-1 overflow-y-auto pt-[env(safe-area-inset-top)] pb-[calc(56px+env(safe-area-inset-bottom)+16px)]">
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