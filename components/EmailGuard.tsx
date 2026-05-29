"use client";

import { useAuth } from "@/lib/AuthContext";
import { isAuthPublicRoute } from "@/components/auth/authRoutes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function EmailGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname() || "";
  const router = useRouter();
  const isFirstLoadDone = useRef(false);
  const isPublic = isAuthPublicRoute(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }
    if (user && !user.emailVerified && !isPublic) {
      router.replace("/verify-email");
    }
  }, [isPublic, loading, pathname, router, user]);

  if (!loading && !isFirstLoadDone.current) {
    isFirstLoadDone.current = true;
  }

  if (loading && !isFirstLoadDone.current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-[#0A84FF] to-[#0051D5] text-xl font-black text-white shadow-xl shadow-sky-500/30 motion-safe:animate-pulse">
          A
        </div>
      </div>
    );
  }

  if (!isPublic && (!user || !user.emailVerified) && isFirstLoadDone.current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-[#0A84FF] to-[#0051D5] text-xl font-black text-white shadow-xl shadow-sky-500/30 motion-safe:animate-pulse">
          A
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
