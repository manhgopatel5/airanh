"use client";

import { usePathname, useRouter } from "next/navigation";
import FCMProvider from "@/components/FCMProvider";
import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "react-hot-toast";

type Props = {
  children: React.ReactNode;
};

export default function ClientLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const user: { uid: string } | null = null;
  const [loading, setLoading] = useState(true);

  /* ================= ROUTE ================= */
  // ✅ SỬA: Đổi /reset-password thành /forgot-password
  const publicRoutes = ["/login", "/register", "/forgot-password", "/verify-email"];
  const isPublic = useMemo(() => publicRoutes.some((r) => pathname.startsWith(r)), [pathname]);
  const isChatDetail = /^\/chat\/[^/]+$/.test(pathname);
  const isCreate = pathname.startsWith("/create");

  /* ================= REDIRECT ================= */
  useEffect(() => {
    if (user === undefined) return;
    setLoading(false);

    if (!user &&!isPublic) {
      router.replace("/login");
      return;
    }
    if (user && isPublic) {
      router.replace("/");
      return;
    }
  }, [user, isPublic, router]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900">
        <div className="max-w-2xl mx-auto p-4 space-y-4 pt-8">
          <div className="flex justify-around pb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                <div className="w-10 h-2 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>

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

      {/* FCM chạy client-only */}
      {user && <FCMProvider userId={user.uid} />}

      <div className={!isChatDetail &&!isCreate? "pb-24" : ""}>
        {children}
      </div>

      {!isPublic && user &&!isChatDetail &&!isCreate && <BottomNav />}

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
