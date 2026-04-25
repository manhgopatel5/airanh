"use client";

import { usePathname, useRouter } from "next/navigation";
import FCMProvider from "@/components/FCMProvider";
import { useEffect, useMemo } from "react";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/lib/AuthContext"; // ✅ QUAN TRỌNG

type Props = {
  children: React.ReactNode;
};

export default function ClientLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const router = useRouter();

  // ✅ LẤY AUTH THẬT
  const { user, userData, loading } = useAuth();

  /* ================= ROUTE ================= */
  const publicRoutes = ["/login", "/register", "/forgot-password", "/verify-email"];
  const isPublic = useMemo(
    () => publicRoutes.some((r) => pathname.startsWith(r)),
    [pathname]
  );

  const isChatDetail = /^\/chat\/[^/]+$/.test(pathname);
  const isCreate = pathname.startsWith("/create");

  /* ================= REDIRECT ================= */
  useEffect(() => {
    if (loading) return;

    // ❌ chưa login
    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }

    // ❌ đã login mà vào auth page
    if (user && isPublic) {
      router.replace("/");
      return;
    }

    // 🔥 QUAN TRỌNG: chờ userData
    if (user && !userData) {
      return;
    }
  }, [user, userData, loading, isPublic, router]);

  /* ================= LOADING ================= */
  if (loading || (user && !userData)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900">
        <div className="max-w-2xl mx-auto p-4 space-y-4 pt-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-4 animate-pulse border border-gray-100 dark:border-zinc-800"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-colors">

      {/* ✅ FCM */}
      {user && <FCMProvider userId={user.uid} />}

      <div className={!isChatDetail && !isCreate ? "pb-24" : ""}>
        {children}
      </div>

      {!isPublic && user && !isChatDetail && !isCreate && <BottomNav />}

      <Toaster
        position="top-center"
        toastOptions={{
          className: "text-sm",
          duration: 3000,
        }}
      />
    </div>
  );
}
