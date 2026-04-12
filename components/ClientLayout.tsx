"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/AuthContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [mounted, setMounted] = useState(false);

  const publicRoutes = ["/login", "/register"];
  const isPublic = publicRoutes.includes(pathname);

  // ✅ đảm bảo chỉ render sau khi client mount (fix hydration)
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ xử lý redirect auth
  useEffect(() => {
    if (!mounted || loading) return;

    if (!user && !isPublic) {
      router.replace("/login");
    }

    if (user && isPublic) {
      router.replace("/");
    }
  }, [user, loading, isPublic, pathname, router, mounted]);

  // ❗ QUAN TRỌNG: tránh mismatch server/client
  if (!mounted) return null;

  // ✅ loading UI
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="pb-20">
      {children}
      {!isPublic && user && <BottomNav />}
    </div>
  );
}
