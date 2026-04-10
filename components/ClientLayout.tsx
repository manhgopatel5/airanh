"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";

export default function ClientLayout({ children }: any) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState<boolean | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("user");

    // Nếu chưa login → chặn
    if (!user && pathname !== "/login" && pathname !== "/register") {
      router.replace("/login");
    } else {
      setIsLogin(true);
    }
  }, [pathname]);

  // ⛔ chưa xác định login → không render gì
  if (isLogin === null) return null;

  const hideNav =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";

  return (
    <>
      {children}
      {!hideNav && <BottomNav />}
    </>
  );
}
